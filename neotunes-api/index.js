require('dotenv').config();
const express = require('express');
const cors = require('cors');

const youtubeService = require('./services/youtube');
const jamendoService = require('./services/jamendo');
const spotifyService = require('./services/spotify');
const archiveService = require('./services/internetArchive');

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory TTL Cache
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value, ttlSeconds) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000
  });
}

// Main Search Endpoint — Unifies YouTube, Spotify, Jamendo & Internet Archive
app.get('/search', async (req, res) => {
  try {
    const { q, source = 'all', videoCategoryId } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter "q"' });

    const allowedSources = new Set(['all', 'youtube', 'jamendo', 'spotify', 'archive']);
    if (!allowedSources.has(source)) {
      return res.status(400).json({ error: 'Invalid source. Use all, youtube, jamendo, spotify, or archive.' });
    }

    console.log(`[API Search] Query: "${q}" | Source: "${source}"`);

    // Check Cache
    const cacheKey = `search:${source}:${q}:${videoCategoryId || ''}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Search Query: "${q}" (Source: ${source})`);
      return res.json(cachedData);
    }

    const results = [];
    const providerErrors = [];

    const collectProvider = async (providerName, fetcher) => {
      try {
        const providerTracks = await fetcher();
        results.push(...providerTracks);
      } catch (error) {
        providerErrors.push({ provider: providerName, error: error.message || 'Unknown provider error' });
      }
    };

    // Fetch from Youtube
    if (source === 'all' || source === 'youtube') {
      await collectProvider('youtube', () => youtubeService.search(q, 10, { videoCategoryId, throwOnError: true }));
    }

    // Fetch from Jamendo
    if (source === 'all' || source === 'jamendo') {
      await collectProvider('jamendo', () => jamendoService.search(q, 10, { throwOnError: true }));
    }

    // Fetch from Spotify
    if (source === 'all' || source === 'spotify') {
      await collectProvider('spotify', () => spotifyService.search(q, 15, { throwOnError: true }));
    }

    // Fetch from Internet Archive
    if (source === 'all' || source === 'archive') {
      await collectProvider('archive', () => archiveService.search(q, 10, { throwOnError: true }));
    }
    
    // Sort to blend results or just return
    results.sort((a, b) => {
      if (a.source === 'spotify_proxy' && b.source !== 'spotify_proxy') return -1;
      if (a.source !== 'spotify_proxy' && b.source === 'spotify_proxy') return 1;
      return 0;
    });

    if (results.length === 0 && providerErrors.length > 0) {
      return res.status(502).json({
        error: 'No providers returned results',
        providerErrors,
      });
    }

    // Save to Cache
    setCached(cacheKey, results, 30 * 60); // Cache for 30 minutes

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Resolve Proxy Audio Endpoint
app.get('/resolve', async (req, res) => {
  try {
    const { searchQuery } = req.query;
    if (!searchQuery) return res.status(400).json({ error: 'Missing searchQuery' });

    console.log(`[API Resolve] SearchQuery: "${searchQuery}"`);

    // Check Cache
    const cacheKey = `resolve:${searchQuery}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Resolve Query: "${searchQuery}"`);
      return res.json(cachedData);
    }

    // 1. Try Jamendo
    try {
      const jamendoTracks = await jamendoService.search(searchQuery, 1);
      if (jamendoTracks.length > 0 && jamendoTracks[0].url) {
        const responseData = {
          url: jamendoTracks[0].url,
          id: jamendoTracks[0].id,
          resolvedSource: 'jamendo',
        };
        setCached(cacheKey, responseData, 24 * 60 * 60); // 24 hours
        return res.json(responseData);
      }
    } catch (err) {
      console.warn('[Resolve] Jamendo lookup failed:', err.message);
    }

    // 2. Try Internet Archive
    try {
      const archiveTracks = await archiveService.search(searchQuery, 3);
      if (archiveTracks.length > 0) {
        for (const track of archiveTracks) {
          const identifier = track.id.replace('archive_', '');
          const url = await archiveService.resolveTrackUrl(identifier);
          if (url) {
            const responseData = {
              url: url,
              id: track.id,
              resolvedSource: 'archive',
            };
            setCached(cacheKey, responseData, 24 * 60 * 60); // 24 hours
            return res.json(responseData);
          }
        }
      }
    } catch (err) {
      console.warn('[Resolve] Internet Archive lookup failed:', err.message);
    }

    // 3. Try YouTube
    try {
      const youtubeTracks = await youtubeService.search(searchQuery, 1);
      if (youtubeTracks.length > 0) {
        const responseData = {
          url: null,
          id: youtubeTracks[0].id,
          resolvedSource: 'youtube',
        };
        setCached(cacheKey, responseData, 24 * 60 * 60); // 24 hours
        return res.json(responseData);
      }
    } catch (err) {
      console.warn('[Resolve] YouTube lookup failed:', err.message);
    }

    res.status(404).json({ error: 'Could not resolve audio for track.' });
  } catch (error) {
    console.error('Resolve Error:', error);
    res.status(500).json({ error: 'Failed to resolve' });
  }
});

// Trending Endpoint (Global / India)
app.get('/trending', async (req, res) => {
  try {
    const { region = 'global' } = req.query;
    const allowedRegions = new Set(['global', 'india']);
    if (!allowedRegions.has(region)) {
      return res.status(400).json({ error: 'Invalid region. Use global or india.' });
    }

    console.log(`[API Trending] Region: "${region}"`);

    // Check Cache
    const cacheKey = `trending:${region}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Trending: "${region}"`);
      return res.json(cachedData);
    }

    const query = region === 'global' ? 'top hits 2024 global' : 'bollywood hits 2024 india';
    
    // For trending we'll just use youtube for now to get mainstream hits
    const results = await youtubeService.search(query, 15, { throwOnError: true });
    
    setCached(cacheKey, results, 6 * 60 * 60); // Cache for 6 hours

    res.json(results);
  } catch (error) {
    const message = error.message || 'Unknown provider error';
    console.error('Trending Error:', message);
    res.status(502).json({
      error: 'Trending provider unavailable',
      providerErrors: [
        {
          provider: 'youtube',
          error: message,
        },
      ],
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎵 NeoTunes API running on http://localhost:${PORT}`);
});

module.exports = app;
