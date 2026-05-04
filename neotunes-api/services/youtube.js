const axios = require('axios');

const BLOCK_COLORS = ['#7B61FF', '#00D4FF', '#00FF85', '#FF6B6B', '#FFD700', '#FF4ECD'];

async function search(query, maxResults = 10, options = {}) {
  const { throwOnError = false } = options;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      const message = 'YOUTUBE_API_KEY not found in backend .env';
      if (throwOnError) throw new Error(message);
      console.warn(`⚠️ ${message}`);
      return [];
    }

    const url = 'https://www.googleapis.com/youtube/v3/search';
    const response = await axios.get(url, {
      params: {
        part: 'snippet',
        maxResults,
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music
        key: apiKey
      }
    });

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
    if (throwOnError) throw new Error(message);
    console.error('YouTube API Error:', message);
    return [];
  }
}

module.exports = {
  search
};
