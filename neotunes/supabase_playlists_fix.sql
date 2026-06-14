-- NeoTunes: Playlists backend patch
-- Apply this in the Supabase SQL editor for the project used by neotunes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own playlists" ON public.playlists;
CREATE POLICY "Users manage their own playlists"
    ON public.playlists
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    artwork TEXT NOT NULL,
    color TEXT NOT NULL,
    source TEXT,
    url TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own playlist tracks" ON public.playlist_tracks;
CREATE POLICY "Users manage their own playlist tracks"
    ON public.playlist_tracks
    FOR ALL
    USING (EXISTS (
        SELECT 1
        FROM public.playlists p
        WHERE p.id = playlist_tracks.playlist_id
          AND p.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM public.playlists p
        WHERE p.id = playlist_tracks.playlist_id
          AND p.user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_playlists_user_created_at
    ON public.playlists (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_added_at
    ON public.playlist_tracks (playlist_id, added_at DESC);
