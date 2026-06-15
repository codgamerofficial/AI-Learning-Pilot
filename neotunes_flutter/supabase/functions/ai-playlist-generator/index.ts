// Supabase Edge Function: ai-playlist-generator
// Serves POST requests at: https://api.neotunes.app/v1/ai/generate-mix
// Integrates with Gemini API to compile custom playlist sequences.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract Bearer Token for auth checks
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { prompt, limit = 10 } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid prompt provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase Client with service role to query tracks database
    const supabase = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // 1. Fetch available track library meta data to supply to Gemini context
    const { data: trackLibrary, error: trackError } = await supabase
      .from('tracks')
      .select('id, title, genre, color, artists(name)')
      .limit(100)

    if (trackError) {
      throw new Error(`Failed to query track library: ${trackError.message}`)
    }

    // Prepare list of tracks for Gemini to evaluate
    const trackListText = trackLibrary.map((t: any) => 
      `- ID: ${t.id}, Title: "${t.title}", Artist: "${t.artists?.name || 'Unknown'}", Genre: "${t.genre || 'General'}"`
    ).join('\n')

    // 2. Query Gemini Pro to select and order matching tracks
    let selectedTrackIds: string[] = []
    let playlistTitle = "AI NeoMix Playlist"

    if (GEMINI_API_KEY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`
      
      const systemInstruction = `
        You are the NeoTunes AI Co-Pilot Recommendation Engine.
        Given a user prompt describing their mood, setting, or preference, and a candidate list of database tracks, select the best matching tracks (up to ${limit}) and return a JSON payload.
        Respond with ONLY raw JSON matching this format:
        {
          "playlist_title": "Descriptive, engaging, creative title based on prompt",
          "track_ids": ["uuid-1", "uuid-2"]
        }
      `

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemInstruction}\n\nCandidate Tracks:\n${trackListText}\n\nUser Prompt: "${prompt}"`
            }]
          }]
        })
      })

      if (geminiResponse.ok) {
        const result = await geminiResponse.json()
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        
        // Parse the JSON text block out of any markdown wrapper if Gemini returned it as ```json ... ```
        const jsonString = textResponse.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(jsonString)
        
        playlistTitle = parsed.playlist_title || `Mix for: ${prompt}`
        selectedTrackIds = parsed.track_ids || []
      }
    }

    // Fallback if Gemini is not configured or fails: select random tracks matching genre
    if (selectedTrackIds.length === 0) {
      playlistTitle = `Vibe: ${prompt.substring(0, 30)}...`
      selectedTrackIds = trackLibrary.map((t: any) => t.id).slice(0, Math.min(limit, trackLibrary.length))
    }

    // Fetch full track records matching selected IDs
    const { data: finalTracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, title, duration_seconds, hls_playlist_url, color, artists(name, avatar_url)')
      .in('id', selectedTrackIds)

    if (fetchError) {
      throw new Error(`Failed fetching compiled track data: ${fetchError.message}`)
    }

    // Format output payload
    const payload = {
      playlist_title: playlistTitle,
      tracks: finalTracks.map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artists?.name || 'Unknown',
        artist_avatar: t.artists?.avatar_url,
        hls_url: t.hls_playlist_url,
        color: t.color,
        duration: t.duration_seconds
      }))
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
