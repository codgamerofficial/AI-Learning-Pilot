-- NeoTunes Library Schema
-- Run this inside your Supabase SQL Editor!

CREATE TABLE IF NOT EXISTS public.saved_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    artwork TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.saved_tracks ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see and add their own tracks
CREATE POLICY "Users can only see their own saved tracks"
    ON public.saved_tracks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved tracks"
    ON public.saved_tracks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved tracks"
    ON public.saved_tracks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own playlists"
    ON public.playlists
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Playlist Tracks Table
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

CREATE POLICY "Users manage their own playlist tracks"
    ON public.playlist_tracks
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.playlists p 
        WHERE p.id = playlist_tracks.playlist_id 
        AND p.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.playlists p 
        WHERE p.id = playlist_tracks.playlist_id 
        AND p.user_id = auth.uid()
    ));
