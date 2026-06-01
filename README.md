# Braino

## Spotify setup

The Spotify UI is already wired into the dashboard and extension, but it only works after the Supabase backend is configured.

1. Create a Spotify app in the Spotify developer dashboard.
2. Add this redirect URI to that Spotify app:

```txt
https://<your-project-ref>.supabase.co/functions/v1/spotify-oauth-callback
```

3. Set these Supabase Edge Function secrets:

```bash
supabase secrets set \
  SPOTIFY_CLIENT_ID=... \
  SPOTIFY_CLIENT_SECRET=... \
  SPOTIFY_REDIRECT_URI=https://<your-project-ref>.supabase.co/functions/v1/spotify-oauth-callback
```

For local Edge Function runs, make sure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are present too.

4. Apply the database migration so `spotify_connections` exists:

```bash
supabase db push
```

5. Deploy the Spotify functions:

```bash
supabase functions deploy spotify-oauth-start
supabase functions deploy spotify-oauth-callback
supabase functions deploy spotify-search
supabase functions deploy spotify-player-state
supabase functions deploy spotify-playback
supabase functions deploy spotify-web-playback-token
supabase functions deploy spotify-add-track
```

6. Make sure the frontend is pointing at the same Supabase project via `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
7. Sign into Braino, open the dashboard, and click `Connect Spotify`.

## Notes

- Browser playback uses Spotify's Web Playback SDK and requires Spotify Premium.
- The dashboard connect/search/playback flow uses the Spotify Edge Functions above.
- The extension's "add this song to Spotify" flow now depends on `spotify-add-track`.
