const axios = require('axios');

const BLOCK_COLORS = ['#7B61FF', '#00D4FF', '#00FF85', '#FF6B6B', '#FFD700', '#FF4ECD'];

async function search(query, limit = 10, options = {}) {
  const { throwOnError = false } = options;
  
  try {
    console.log(`[Internet Archive] Searching for "${query}"...`);
    const searchUrl = 'https://archive.org/advancedsearch.php';
    const params = {
      q: `title:(${query}) AND mediatype:(audio)`,
      'fl[]': ['identifier', 'title', 'creator', 'downloads'],
      'sort[]': ['downloads desc'],
      output: 'json',
      rows: limit
    };

    const response = await axios.get(searchUrl, { params });
    const docs = response.data?.response?.docs || [];
    
    const results = [];
    
    for (const doc of docs) {
      if (!doc.identifier) continue;
      
      const title = doc.title || 'Unknown Title';
      const artist = doc.creator || 'Internet Archive';
      
      // Build a basic metadata url to find a playable MP3 file
      // Since doing a network call per search result is slow, we can construct a default fallback stream URL
      // Or we can try to resolve the first MP3 file on player request.
      // To keep search fast, we return the identifier as the id and set source as 'archive'.
      // When resolved, we will fetch the metadata to find the exact MP3 filename.
      // If we want a quick url directly, we can point to a standard pattern, but metadata fetch is more reliable.
      // We will store the search query to resolve it later.
      results.push({
        id: `archive_${doc.identifier}`,
        title: title,
        artist: artist,
        artwork: 'https://archive.org/images/glogo.png', // Internet Archive Logo
        color: BLOCK_COLORS[results.length % BLOCK_COLORS.length],
        source: 'archive',
        searchQuery: doc.title ? `${doc.title} ${artist}` : query
      });
    }

    return results;
  } catch (error) {
    console.error('Internet Archive Search Error:', error.message);
    if (throwOnError) throw error;
    return [];
  }
}

async function resolveTrackUrl(identifier) {
  try {
    console.log(`[Internet Archive] Resolving stream URL for "${identifier}"...`);
    const metadataUrl = `https://archive.org/metadata/${identifier}`;
    const response = await axios.get(metadataUrl);
    
    const files = response.data?.files || [];
    // Find the first file that is an MP3
    const mp3File = files.find(f => f.name && f.name.endsWith('.mp3') && f.format === 'VBR MP3' || f.format === 'MP3');
    
    if (mp3File) {
      const url = `https://archive.org/download/${identifier}/${encodeURIComponent(mp3File.name)}`;
      return url;
    }
    
    // Fallback if no specific MP3 found: try first file ending with .mp3
    const anyMp3 = files.find(f => f.name && f.name.toLowerCase().endsWith('.mp3'));
    if (anyMp3) {
      return `https://archive.org/download/${identifier}/${encodeURIComponent(anyMp3.name)}`;
    }
    
    return null;
  } catch (error) {
    console.error('Internet Archive URL Resolve Error:', error.message);
    return null;
  }
}

module.exports = {
  search,
  resolveTrackUrl
};
