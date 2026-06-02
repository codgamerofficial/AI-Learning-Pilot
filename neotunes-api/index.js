require('dotenv').config();
const express = require('express');
const cors = require('cors');

const youtubeService = require('./services/youtube');
const jamendoService = require('./services/jamendo');
const spotifyService = require('./services/spotify');

const app = express();
app.use(cors());
app.use(express.json());

// Main Search Endpoint — Unifies YouTube & Jamendo
app.get('/search', async (req, res) => {
  try {
    const { q, source = 'all', videoCategoryId } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter "q"' });

    const allowedSources = new Set(['all', 'youtube', 'jamendo', 'spotify']);
    if (!allowedSources.has(source)) {
      return res.status(400).json({ error: 'Invalid source. Use all, youtube, jamendo, or spotify.' });
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
    
    // Sort to blend results or just return
    // We give high priority to Spotify data since it has real durations and cleaner titles.
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

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Resolve Proxy Audio Endpoint
// Prefer direct Jamendo audio when possible so native playback can keep running in the background.
app.get('/resolve', async (req, res) => {
  try {
    const { searchQuery } = req.query;
    if (!searchQuery) return res.status(400).json({ error: 'Missing searchQuery' });

    const jamendoTracks = await jamendoService.search(searchQuery, 1);
    if (jamendoTracks.length > 0 && jamendoTracks[0].url) {
      return res.json({
        url: jamendoTracks[0].url,
        id: jamendoTracks[0].id,
        resolvedSource: 'jamendo',
      });
    }

    const youtubeTracks = await youtubeService.search(searchQuery, 1);
    if (youtubeTracks.length > 0) {
      return res.json({
        url: null,
        id: youtubeTracks[0].id,
        resolvedSource: 'youtube',
      });
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

    const query = region === 'global' ? 'top hits 2024 global' : 'bollywood hits 2024 india';
    
    // For trending we'll just use youtube for now to get mainstream hits
    const results = await youtubeService.search(query, 15, { throwOnError: true });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎵 NeoTunes API running on http://localhost:${PORT}`);
});

module.exports = app;
