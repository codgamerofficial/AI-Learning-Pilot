const axios = require('axios');

let spotifyToken = null;
let tokenExpiration = 0;

async function getAccessToken(options = {}) {
  const { throwOnError = false } = options;

  if (spotifyToken && Date.now() < tokenExpiration) return spotifyToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const message = 'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET missing.';
    if (throwOnError) throw new Error(message);
    console.warn(`⚠️ ${message}`);
    return null;
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
    });
    
    spotifyToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (error) {
    const message = error.response?.data?.error_description || error.response?.data?.error || error.message;
    if (throwOnError) throw new Error(message);
    console.error('Spotify token error:', error.response?.data || error.message);
    return null;
  }
}

async function search(query, limit = 15, options = {}) {
  const { throwOnError = false } = options;
  const token = await getAccessToken({ throwOnError });
  if (!token) return [];

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: { q: query, type: 'track', limit },
      headers: { Authorization: `Bearer ${token}` }
    });

    const items = response.data?.tracks?.items || [];
    
    return items
      .filter(item => item?.id && item?.name && item?.artists?.length > 0 && item?.album?.images?.length > 0)
      .map(item => ({
        id: `spot_${item.id}`,
        title: item.name,
        artist: item.artists[0].name,
        artwork: item.album.images[0].url,
        duration_ms: item.duration_ms,
        source: 'spotify_proxy',
        searchQuery: `${item.name} ${item.artists[0].name} Audio`
      }));
  } catch (error) {
    const message = error.response?.data?.error?.message || error.response?.data?.error_description || error.message;
    if (throwOnError) throw new Error(message);
    console.error('Spotify Search Error:', error.response?.data || error.message);
    return [];
  }
}

module.exports = { search };
