-- 1. Insert bootstrap artists
insert into public.artists (id, name, avatar_url, bio, is_verified, monthly_listeners)
values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'The Weeknd', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop', 'Abel Makkonen Tesfaye, known professionally as The Weeknd, is a Canadian singer-songwriter and record producer.', true, 104500000),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Arijit Singh', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop', 'Arijit Singh is an Indian playback singer and music composer. He sings predominantly in Hindi and Bengali.', true, 42000000);

-- 2. Insert bootstrap albums
insert into public.albums (id, title, artist_id, artwork_url, release_date, genre)
values
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Starboy', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop', '2016-11-25', 'R&B/Pop'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2a2a2a2a2', 'Brahmastra', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop', '2022-09-09', 'Bollywood');

-- 3. Insert bootstrap tracks with synced lyrics JSON
insert into public.tracks (id, title, artist_id, album_id, hls_playlist_url, duration_seconds, color, lyrics_json)
values
  (
    'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
    'Starboy',
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    'https://cdn.neotunes.app/hls/starboy/playlist.m3u8',
    230,
    '#7C3AED',
    '[
      {"time": 0, "text": "🎵 (Starboy - Instrumental Intro) 🎵"},
      {"time": 8, "text": "I''m tryna put you in the worst mood, ah"},
      {"time": 12, "text": "P1 cleaner than your church shoes, ah"},
      {"time": 16, "text": "Milli point two on the coupe, ah"},
      {"time": 20, "text": "House so empty, need a centerpiece"},
      {"time": 24, "text": "Twenty racks a table cut from ebony"},
      {"time": 28, "text": "Cut that ivory into skinny pieces"},
      {"time": 31, "text": "Then she clean it with her face"},
      {"time": 33, "text": "Man, I love my baby, ah"},
      {"time": 36, "text": "You talkin'' money, need a hearing aid"},
      {"time": 40, "text": "You talkin'' ''bout me, I don''t see the shade"},
      {"time": 44, "text": "Switch up my cup, I kill any pain"},
      {"time": 48, "text": "Look what you''ve done"},
      {"time": 51, "text": "I''m a motherfuckin'' starboy"}
    ]'::jsonb
  ),
  (
    'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
    'Kesariya',
    'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2a2a2a2a2',
    'https://cdn.neotunes.app/hls/kesariya/playlist.m3u8',
    268,
    '#FF9933',
    '[
      {"time": 0, "text": "🎵 (Kesariya - Sitar Intro) 🎵"},
      {"time": 12, "text": "Mujhko itna bataaye koi"},
      {"time": 18, "text": "Kaise tujhse dil na lagaaye koi"},
      {"time": 24, "text": "Rabba ne tujhko banaane mein"},
      {"time": 30, "text": "Kardi hai husn ki khaali tijoriyaan"},
      {"time": 36, "text": "Kajal ki siyaahi se likhi hai tune"},
      {"time": 42, "text": "Jaane kitno ki love storiyaan"},
      {"time": 47, "text": "Kesariya tera ishq hai piya"},
      {"time": 53, "text": "Rang jaaun jo main haath lagaaun"},
      {"time": 59, "text": "Din beete saara teri fikr mein"},
      {"time": 65, "text": "Rain saari teri khair manaayn"}
    ]'::jsonb
  );
