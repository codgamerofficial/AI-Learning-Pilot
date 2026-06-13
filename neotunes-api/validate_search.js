require('dotenv').config();
const youtube = require('./services/youtube');
const jamendo = require('./services/jamendo');
const spotify = require('./services/spotify');
const archive = require('./services/internetArchive');

async function check() {
  const query = 'Imagine Dragons';
  const envVars = {
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
    JAMENDO_CLIENT_ID: !!process.env.JAMENDO_CLIENT_ID,
    SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET
  };
  console.log('Env Vars:', JSON.stringify(envVars));

  const providers = [
    { name: 'Youtube', service: youtube },
    { name: 'Jamendo', service: jamendo },
    { name: 'Spotify', service: spotify },
    { name: 'Internet Archive', service: archive }
  ];

  for (const p of providers) {
    try {
      console.log(`Searching ${p.name}...`);
      const results = await p.service.search(query, 3, { throwOnError: true });
      console.log(`${p.name} results count:`, results.length);
      if (results.length > 0) {
        console.log(`Sample result:`, JSON.stringify(results[0]));
      }
    } catch (err) {
      console.error(`${p.name} error:`, err.message);
    }
  }
}

check();
