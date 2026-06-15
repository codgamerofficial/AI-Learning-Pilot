-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Users Profile Table (linked to Supabase Auth)
create table public.users (
    id uuid references auth.users on delete cascade primary key,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    subscription_tier text default 'free' check (subscription_tier in ('free', 'premium'))
);

alter table public.users enable row level security;

create policy "Allow public read access to profiles"
on public.users for select
using (true);

create policy "Allow users to update their own profiles"
on public.users for update
using (auth.uid() = id);

-- 2. Artists Table
create table public.artists (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    avatar_url text,
    bio text,
    is_verified boolean default false,
    monthly_listeners integer default 0
);

alter table public.artists enable row level security;

create policy "Allow public read access to artists"
on public.artists for select
using (true);

-- 3. Albums Table
create table public.albums (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    artist_id uuid references public.artists(id) on delete cascade not null,
    artwork_url text,
    release_date date,
    genre text
);

alter table public.albums enable row level security;

create policy "Allow public read access to albums"
on public.albums for select
using (true);

-- 4. Tracks Table
create table public.tracks (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    artist_id uuid references public.artists(id) on delete cascade not null,
    album_id uuid references public.albums(id) on delete set null,
    hls_playlist_url text not null, -- Path to HLS playlist on Cloudflare R2
    duration_seconds integer not null,
    color text default '#7C3AED', -- Primary visualizer theme color
    lyrics_json jsonb -- Array of timed lyrics [{"time": 8, "text": "I'm tryna put you..."}]
);

alter table public.tracks enable row level security;

create policy "Allow public read access to tracks"
on public.tracks for select
using (true);

-- 5. Playlists Table
create table public.playlists (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    user_id uuid references public.users(id) on delete cascade not null,
    is_collaborative boolean default false,
    join_code text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.playlists enable row level security;

create policy "Allow users to view all playlists they own or collaborate in"
on public.playlists for select
using (auth.uid() = user_id or is_collaborative = true);

create policy "Allow owners to edit playlists"
on public.playlists for all
using (auth.uid() = user_id);

-- 6. Playlist Tracks Junction Table
create table public.playlist_tracks (
    playlist_id uuid references public.playlists(id) on delete cascade,
    track_id uuid references public.tracks(id) on delete cascade,
    added_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (playlist_id, track_id)
);

alter table public.playlist_tracks enable row level security;

create policy "Allow users to view playlist tracks"
on public.playlist_tracks for select
using (true);

create policy "Allow playlist owners to manage tracks"
on public.playlist_tracks for all
using (
    exists (
        select 1 from public.playlists
        where playlists.id = playlist_id and playlists.user_id = auth.uid()
    )
);

-- 7. Saved/Liked Tracks Table
create table public.saved_tracks (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    track_id uuid references public.tracks(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (user_id, track_id)
);

alter table public.saved_tracks enable row level security;

create policy "Users can manage their own saved tracks"
on public.saved_tracks for all
using (auth.uid() = user_id);

-- 8. Auto-create User Profile Trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, avatar_url, subscription_tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
