const axios = require('axios');

const BLOCK_COLORS = ['#7B61FF', '#00D4FF', '#00FF85', '#FF6B6B', '#FFD700', '#FF4ECD'];

async function searchScraperFallback(query, maxResults = 10) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = response.data;
    const regex = /ytInitialData\s*=\s*({.+?});/;
    const match = html.match(regex);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents) return [];

    const itemSection = contents.find(c => c.itemSectionRenderer);
    const items = itemSection?.itemSectionRenderer?.contents;
    if (!items) return [];

    const results = [];
    for (const item of items) {
      if (results.length >= maxResults) break;

      const video = item.videoRenderer;
      if (!video || !video.videoId) continue;

      const title = video.title?.runs?.[0]?.text || 'Unknown Title';
      const artist = video.ownerText?.runs?.[0]?.text || 'Unknown Artist';
      const artwork = video.thumbnail?.thumbnails?.[0]?.url;

      results.push({
        id: video.videoId,
        title,
        artist,
        artwork,
        color: BLOCK_COLORS[results.length % BLOCK_COLORS.length],
        source: 'youtube'
      });
    }

    return results;
  } catch (err) {
    console.error('YouTube HTML Scraper Fallback Error:', err.message);
    return [];
  }
}

async function search(query, maxResults = 10, options = {}) {
  const { throwOnError = false } = options;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn(`⚠️ YOUTUBE_API_KEY not found in backend .env. Running scraper...`);
      return await searchScraperFallback(query, maxResults);
    }

    const isPodcastOrAudiobook = /podcast|audiobook|audio\s*book|episode|show|talk|novel|reading|interview/i.test(query);
    const customCategoryId = options.videoCategoryId;

    const params = {
      part: 'snippet',
      maxResults,
      q: query,
      type: 'video',
      key: apiKey
    };

    if (customCategoryId !== undefined) {
      if (customCategoryId !== 'all' && customCategoryId !== '') {
        params.videoCategoryId = customCategoryId;
      }
    } else if (!isPodcastOrAudiobook) {
      params.videoCategoryId = '10'; // Default to Music category
    }

    const url = 'https://www.googleapis.com/youtube/v3/search';
    const response = await axios.get(url, { params });

    if (!response.data || !response.data.items) return [];

    return response.data.items
      .filter(item => item.id?.videoId) // Filter out items without videoId
      .map((item, index) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        artwork: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        color: BLOCK_COLORS[index % BLOCK_COLORS.length],
        source: 'youtube'
      }));
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message;
    console.warn(`⚠️ YouTube API Error (${message}). Falling back to HTML scraper...`);
    
    try {
      const scraped = await searchScraperFallback(query, maxResults);
      if (scraped && scraped.length > 0) {
        return scraped;
      }
    } catch (scraperErr) {
      console.error('YouTube Scraper Fallback also failed:', scraperErr.message);
    }

    if (throwOnError) throw new Error(message);
    return [];
  }
}

module.exports = {
  search
};
