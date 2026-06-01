import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Disc3, ExternalLink, Loader2, MonitorSpeaker, Pause, Play, RefreshCcw, Search, SkipBack, SkipForward } from "lucide-react";

export type SpotifyConnectionSummary = {
  display_name: string | null;
  spotify_email: string | null;
  product: string | null;
  updated_at: string | null;
} | null;

type SpotifyTrack = {
  id: string | null;
  uri: string | null;
  name: string | null;
  artists: string[];
  albumName: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  durationMs: number | null;
  type: string;
};

type SpotifyDevice = {
  id: string | null;
  isActive: boolean;
  isPrivateSession: boolean;
  isRestricted: boolean;
  name: string | null;
  type: string | null;
  volumePercent: number | null;
};

type SpotifyPlayerStatePayload = {
  account: {
    displayName: string | null;
    spotifyEmail: string | null;
    product: string | null;
    country: string | null;
  };
  activeDevice: SpotifyDevice | null;
  devices: SpotifyDevice[];
  isPlaying: boolean;
  progressMs: number;
  repeatState: string;
  shuffleState: boolean;
  track: SpotifyTrack | null;
};

type SpotifyPanelProps = {
  sessionAccessToken: string | null;
  connection: SpotifyConnectionSummary;
  connectLoading: boolean;
  onConnect: () => void;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_API_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

let spotifySdkPromise: Promise<void> | null = null;

function loadSpotifySdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify playback is only available in the browser."));
  }

  if (window.Spotify) {
    return Promise.resolve();
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise;
  }

  spotifySdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-spotify-sdk="true"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      script.dataset.spotifySdk = "true";
      script.onerror = () => reject(new Error("Could not load Spotify Web Playback SDK."));
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => resolve();
  });

  return spotifySdkPromise;
}

function formatTrackDuration(ms: number | null) {
  if (!ms || ms <= 0) {
    return "—";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function artistLine(track: SpotifyTrack | null) {
  if (!track?.artists?.length) {
    return "Unknown artist";
  }
  return track.artists.join(", ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sameSpotifyTrack(a: SpotifyTrack | null, b: SpotifyTrack | null) {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  if (a.uri && b.uri) return a.uri === b.uri;
  return false;
}

export default function SpotifyPanel({
  sessionAccessToken,
  connection,
  connectLoading,
  onConnect,
}: SpotifyPanelProps) {
  const { toast } = useToast();
  const playerRef = useRef<SpotifyWebPlaybackPlayer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [playerState, setPlayerState] = useState<SpotifyPlayerStatePayload | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [browserDeviceId, setBrowserDeviceId] = useState<string | null>(null);
  const [browserPlayerReady, setBrowserPlayerReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [liveProgressMs, setLiveProgressMs] = useState(0);

  const connected = Boolean(connection);
  const isPremium = (connection?.product || playerState?.account.product || "").toLowerCase() === "premium";
  const currentTrack = playerState?.track ?? null;
  const activeDeviceName = playerState?.activeDevice?.name || (browserPlayerReady ? "Braino Player" : null);

  async function fetchProtectedJson<T>(path: string, options?: { method?: string; body?: unknown }) {
    if (!sessionAccessToken) {
      throw new Error("Sign in required.");
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
      method: options?.method || "POST",
      headers: {
        Authorization: `Bearer ${sessionAccessToken}`,
        "Content-Type": "application/json",
        apikey: SUPABASE_API_KEY,
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : JSON.stringify({}),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Spotify request failed (${response.status})`);
    }
    return payload as T;
  }

  async function refreshPlayerState() {
    if (!connected || !sessionAccessToken) {
      setPlayerState(null);
      return;
    }

    setStateLoading(true);
    try {
      const payload = await fetchProtectedJson<SpotifyPlayerStatePayload>("spotify-player-state");
      setPlayerState(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh Spotify.";
      setSdkError((current) => current || message);
    } finally {
      setStateLoading(false);
    }
  }

  async function runPlaybackAction(action: Record<string, unknown>, loadingKey: string) {
    setActionLoading(loadingKey);
    try {
      await fetchProtectedJson("spotify-playback", { body: action });
      await refreshPlayerState();
    } catch (error) {
      toast({
        title: "Spotify action failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePlayTrack(track: SpotifyTrack) {
    if (!track.uri) {
      toast({
        title: "Track unavailable",
        description: "Spotify did not return a playable URI for that result.",
      });
      return;
    }

    setActionLoading(track.id || track.uri);
    try {
      if (browserDeviceId) {
        await playerRef.current?.activateElement?.();
        await fetchProtectedJson("spotify-playback", {
          body: {
            action: "transfer",
            deviceId: browserDeviceId,
            play: false,
          },
        });
      }

      await fetchProtectedJson("spotify-playback", {
        body: {
          action: "play",
          deviceId: browserDeviceId || playerState?.activeDevice?.id || null,
          uris: [track.uri],
        },
      });

      await refreshPlayerState();
    } catch (error) {
      toast({
        title: "Could not start playback",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const payload = await fetchProtectedJson<{ tracks: SpotifyTrack[] }>("spotify-search", {
        body: {
          query,
          limit: 6,
        },
      });
      setSearchResults(Array.isArray(payload.tracks) ? payload.tracks : []);
    } catch (error) {
      toast({
        title: "Spotify search failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!connected) {
      setPlayerState(null);
      setSearchResults([]);
      setBrowserDeviceId(null);
      setBrowserPlayerReady(false);
      setSdkError(null);
      setLiveProgressMs(0);
      return;
    }

    refreshPlayerState().catch(() => null);
  }, [connected, sessionAccessToken]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshPlayerState().catch(() => null);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [connected, sessionAccessToken]);

  useEffect(() => {
    if (!currentTrack) {
      setLiveProgressMs(0);
      return;
    }

    setLiveProgressMs(playerState?.progressMs || 0);
  }, [currentTrack?.id, currentTrack?.uri, playerState?.progressMs]);

  useEffect(() => {
    if (!playerState?.isPlaying || !currentTrack?.durationMs) {
      return;
    }

    const interval = window.setInterval(() => {
      setLiveProgressMs((current) => clamp(current + 1000, 0, currentTrack.durationMs || current + 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [playerState?.isPlaying, currentTrack?.durationMs, currentTrack?.id, currentTrack?.uri]);

  useEffect(() => {
    if (!connected || !sessionAccessToken) {
      playerRef.current?.disconnect();
      playerRef.current = null;
      return;
    }

    let cancelled = false;
    let player: SpotifyWebPlaybackPlayer | null = null;
    const listeners: Array<{ event: string; handler: (payload: any) => void }> = [];

    async function setupPlayer() {
      try {
        await loadSpotifySdk();
        if (cancelled || !window.Spotify) {
          return;
        }

        player = new window.Spotify.Player({
          name: "Braino",
          enableMediaSession: true,
          volume: 0.6,
          getOAuthToken: (callback) => {
            fetchProtectedJson<{ accessToken: string }>("spotify-web-playback-token")
              .then((payload) => callback(payload.accessToken))
              .catch((error) => {
                console.error("spotify token fetch failed:", error);
                setSdkError(error instanceof Error ? error.message : "Could not get a Spotify playback token.");
              });
          },
        });

        const readyHandler = ({ device_id }: { device_id: string }) => {
          setBrowserDeviceId(device_id);
          setBrowserPlayerReady(true);
          setSdkError(null);
          refreshPlayerState().catch(() => null);
        };

        const notReadyHandler = () => {
          setBrowserPlayerReady(false);
        };

        const playerStateHandler = (state: SpotifyPlaybackState | null) => {
          if (!state?.track_window?.current_track) {
            return;
          }

          setPlayerState((current) => {
            const previousTrack = current?.track ?? null;
            const sameTrack = previousTrack?.id && previousTrack.id === (state.track_window.current_track.id ?? null);

            return {
              account: current?.account || {
                displayName: connection?.display_name ?? null,
                spotifyEmail: connection?.spotify_email ?? null,
                product: connection?.product ?? null,
                country: null,
              },
              activeDevice: current?.activeDevice || null,
              devices: current?.devices || [],
              isPlaying: !state.paused,
              progressMs: state.position || 0,
              repeatState: current?.repeatState || "off",
              shuffleState: current?.shuffleState || false,
              track: {
                id: state.track_window.current_track.id ?? null,
                uri: state.track_window.current_track.uri ?? null,
                name: state.track_window.current_track.name ?? null,
                artists: Array.isArray(state.track_window.current_track.artists)
                  ? state.track_window.current_track.artists.map((artist) => artist?.name).filter(Boolean) as string[]
                  : [],
                albumName: state.track_window.current_track.album?.name ?? null,
                imageUrl: state.track_window.current_track.album?.images?.[0]?.url ?? null,
                externalUrl: sameTrack ? previousTrack?.externalUrl ?? null : null,
                durationMs: state.track_window.current_track.duration_ms ?? state.duration ?? null,
                type: "track",
              },
            };
          });
        };

        const errorHandler = ({ message }: { message: string }) => {
          setSdkError(message || "Spotify Web Playback SDK failed to initialize.");
        };

        listeners.push(
          { event: "ready", handler: readyHandler },
          { event: "not_ready", handler: notReadyHandler },
          { event: "player_state_changed", handler: playerStateHandler },
          { event: "initialization_error", handler: errorHandler },
          { event: "authentication_error", handler: errorHandler },
          { event: "account_error", handler: errorHandler },
          { event: "playback_error", handler: errorHandler },
        );

        listeners.forEach(({ event, handler }) => player?.addListener(event, handler));
        const connectedOk = await player.connect();
        if (!connectedOk && !cancelled) {
          setSdkError("Spotify browser playback could not connect.");
        }

        playerRef.current = player;
      } catch (error) {
        if (!cancelled) {
          setSdkError(error instanceof Error ? error.message : "Could not set up Spotify browser playback.");
        }
      }
    }

    setupPlayer().catch(() => null);

    return () => {
      cancelled = true;
      listeners.forEach(({ event, handler }) => player?.removeListener(event, handler));
      player?.disconnect();
      if (playerRef.current === player) {
        playerRef.current = null;
      }
      setBrowserPlayerReady(false);
      setBrowserDeviceId(null);
    };
  }, [connected, sessionAccessToken, connection?.display_name, connection?.spotify_email, connection?.product]);

  const activeSearchQuery = searchQuery.trim();
  const progressPercent = currentTrack?.durationMs
    ? clamp((liveProgressMs / currentTrack.durationMs) * 100, 0, 100)
    : 0;
  const spotlightResults = searchResults.slice(0, 3);
  const aboutCards = currentTrack
    ? [
        {
          label: "Artists",
          value: artistLine(currentTrack),
        },
        {
          label: "Album",
          value: currentTrack.albumName || "Spotify catalog",
        },
        {
          label: "Search trace",
          value: activeSearchQuery ? `“${activeSearchQuery}”` : "Started from Braino controls",
        },
        {
          label: "Output",
          value: activeDeviceName || "Waiting on an active Spotify device",
        },
        {
          label: "Runtime",
          value: `${formatTrackDuration(liveProgressMs)} / ${formatTrackDuration(currentTrack.durationMs)}`,
        },
        {
          label: "Playback tier",
          value: isPremium ? "Premium playback ready" : "Control mode without Premium browser audio",
        },
      ]
    : [];

  return (
    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-[#1ed76033] bg-[#1ed76012] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#168a45]">
              Spotify
            </Badge>
            <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
              {isPremium ? "Premium playback ready" : "Premium needed for browser playback"}
            </Badge>
          </div>
          <h3 className="text-[26px] leading-none tracking-[-0.02em]" style={{ fontFamily: "Instrument Serif, Georgia, serif" }}>
            Spotify <em className="text-[var(--sb-accent-deep)]">player.</em>
          </h3>
          <p className="mt-2 max-w-[760px] text-[13.5px] text-[var(--sb-ink-2)]">
            Search tracks, start playback from Braino, and control the active Spotify device. Browser playback uses Spotify&apos;s Web Playback SDK, which needs a Premium account.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={onConnect}
          disabled={connectLoading || !sessionAccessToken}
          className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
        >
          {connectLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          {connection ? "Reconnect Spotify" : "Connect Spotify"}
        </Button>
      </div>

      {!connected ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] p-6 text-sm text-[var(--sb-ink-3)]">
          Link Spotify first, then Braino can search your music catalog, transfer playback to the browser player, and send play/pause/skip commands.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-bg-2)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                  {connection?.display_name || connection?.spotify_email || "Spotify linked"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em]",
                    browserPlayerReady
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-[var(--sb-line)] bg-[var(--sb-bg-2)] text-[var(--sb-ink-3)]",
                  )}
                >
                  <MonitorSpeaker className="mr-1 h-3 w-3" />
                  {browserPlayerReady ? "Browser player online" : "Browser player idle"}
                </Badge>
                {activeDeviceName ? (
                  <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-bg-2)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                    Active: {activeDeviceName}
                  </Badge>
                ) : null}
              </div>

              {sdkError ? (
                <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  {sdkError}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearch().catch(() => null);
                    }
                  }}
                  placeholder="Search a song, album cut, or artist..."
                  className="border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink)] placeholder:text-[var(--sb-ink-3)]"
                />
                <Button
                  onClick={() => handleSearch().catch(() => null)}
                  disabled={searching}
                  className="rounded-full bg-[var(--sb-ink)] text-[var(--sb-on-ink)] hover:opacity-90"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>

              {(activeSearchQuery || searchResults.length > 0) ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeSearchQuery ? (
                    <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                      Search: {activeSearchQuery}
                    </Badge>
                  ) : null}
                  {searchResults.length > 0 ? (
                    <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                      {searchResults.length} live matches
                    </Badge>
                  ) : null}
                  {currentTrack && activeSearchQuery ? (
                    <Badge variant="outline" className="rounded-full border-[#1ed76033] bg-[#1ed76012] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[#168a45]">
                      Current track tied to search
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {searchResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-4 py-5 text-sm text-[var(--sb-ink-3)]">
                    Search for something and the top Spotify matches will land here.
                  </div>
                ) : (
                  searchResults.map((track) => {
                    const isCurrentResult = sameSpotifyTrack(track, currentTrack);

                    return (
                      <div
                        key={track.id || track.uri || `${track.name}-${track.albumName}`}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition-all",
                          isCurrentResult
                            ? "border-[#1ed76033] bg-[#1ed7600f] shadow-[0_16px_40px_-24px_rgba(30,215,96,0.5)]"
                            : "border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]",
                        )}
                      >
                        {track.imageUrl ? (
                          <img src={track.imageUrl} alt={track.name || "Track cover"} className="h-14 w-14 rounded-lg object-cover" />
                        ) : (
                          <div className="grid h-14 w-14 place-items-center rounded-lg bg-[var(--sb-bg-2)] text-[var(--sb-ink-3)]">
                            <Disc3 className="h-5 w-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{track.name || "Untitled track"}</div>
                            {isCurrentResult ? (
                              <Badge variant="outline" className="rounded-full border-[#1ed76033] bg-[#1ed76012] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#168a45]">
                                Live
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-[12px] text-[var(--sb-ink-3)]">
                            {artistLine(track)}{track.albumName ? ` · ${track.albumName}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="hidden text-[11px] text-[var(--sb-ink-3)] sm:inline">{formatTrackDuration(track.durationMs)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlayTrack(track).catch(() => null)}
                            disabled={actionLoading === (track.id || track.uri || "")}
                            className={cn(
                              "rounded-full border text-xs hover:bg-[var(--sb-bg-2)]",
                              isCurrentResult
                                ? "border-[#1ed76033] bg-[var(--sb-panel)] text-[#168a45]"
                                : "border-[var(--sb-line)] bg-[var(--sb-panel)] text-[var(--sb-ink)]",
                            )}
                          >
                            {actionLoading === (track.id || track.uri || "") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            {isCurrentResult && playerState?.isPlaying ? "Playing" : "Play"}
                          </Button>
                          {track.externalUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(track.externalUrl || "https://open.spotify.com", "_blank", "noopener,noreferrer")}
                              className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={cn(
                "relative overflow-hidden rounded-[28px] border p-5 transition-all duration-500",
                currentTrack ? "sb-spotify-live-card" : "bg-[var(--sb-panel)]",
              )}
              style={currentTrack ? undefined : { borderColor: "var(--sb-line-2)" }}
            >
              {currentTrack ? (
                <div className={cn("sb-spotify-glitter-layer", playerState?.isPlaying && "is-playing")} aria-hidden />
              ) : null}

              <div className="relative z-10">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--sb-ink)]">Now playing</div>
                    {currentTrack ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-[#1ed76033] bg-[#1ed76012] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[#168a45]">
                          {playerState?.isPlaying ? "Live audio" : "Paused"}
                        </Badge>
                        {activeSearchQuery ? (
                          <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.45)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                            Search: {activeSearchQuery}
                          </Badge>
                        ) : null}
                        {activeDeviceName ? (
                          <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.45)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                            {activeDeviceName}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshPlayerState().catch(() => null)}
                    disabled={stateLoading}
                    className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.55)] text-xs text-[var(--sb-ink)] backdrop-blur hover:bg-[rgba(255,255,255,0.75)]"
                  >
                    {stateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                </div>

                {currentTrack ? (
                  <div>
                    <div className="flex items-center gap-4">
                      {currentTrack.imageUrl ? (
                        <img
                          src={currentTrack.imageUrl}
                          alt={currentTrack.name || "Current track"}
                          className="h-24 w-24 rounded-[26px] object-cover shadow-[0_18px_38px_-20px_rgba(27,23,19,0.45)]"
                        />
                      ) : (
                        <div className="grid h-24 w-24 place-items-center rounded-[26px] bg-[rgba(255,255,255,0.45)] text-[var(--sb-ink-3)]">
                          <Disc3 className="h-7 w-7" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-[rgba(27,23,19,0.08)] bg-[rgba(255,255,255,0.45)] text-[var(--sb-ink)]",
                              playerState?.isPlaying && "animate-[spin_10s_linear_infinite]",
                            )}
                          >
                            <Disc3 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="truncate text-[31px] leading-[0.94] tracking-[-0.03em] text-[var(--sb-ink)]"
                              style={{ fontFamily: "Instrument Serif, Georgia, serif" }}
                            >
                              {currentTrack.name || "Unknown track"}
                            </div>
                            <div className="mt-2 truncate text-sm text-[var(--sb-ink-2)]">{artistLine(currentTrack)}</div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--sb-ink-3)]">
                          <span>{currentTrack.albumName || "Spotify"}</span>
                          <span>{formatTrackDuration(liveProgressMs)} / {formatTrackDuration(currentTrack.durationMs)}</span>
                          <span>{isPremium ? "Premium browser playback" : "Control mode"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[var(--sb-ink-3)]">
                        <span>{playerState?.isPlaying ? "Audio in motion" : "Paused in place"}</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.5)]">
                        <div
                          className={cn(
                            "h-full rounded-full bg-[var(--sb-ink)] transition-[width] duration-1000 ease-linear",
                            playerState?.isPlaying && "shadow-[0_0_24px_rgba(30,215,96,0.35)]",
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => runPlaybackAction({ action: "previous", deviceId: browserDeviceId || playerState?.activeDevice?.id || null }, "previous").catch(() => null)}
                        disabled={actionLoading === "previous"}
                        className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.55)] text-[var(--sb-ink)] backdrop-blur hover:bg-[rgba(255,255,255,0.75)]"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() =>
                          runPlaybackAction(
                            {
                              action: playerState?.isPlaying ? "pause" : "play",
                              deviceId: browserDeviceId || playerState?.activeDevice?.id || null,
                            },
                            "toggle",
                          ).catch(() => null)
                        }
                        disabled={actionLoading === "toggle"}
                        className="rounded-full bg-[var(--sb-ink)] text-[var(--sb-on-ink)] shadow-[0_18px_45px_-24px_rgba(27,23,19,0.45)] hover:opacity-90"
                      >
                        {playerState?.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {playerState?.isPlaying ? "Pause" : "Play"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => runPlaybackAction({ action: "next", deviceId: browserDeviceId || playerState?.activeDevice?.id || null }, "next").catch(() => null)}
                        disabled={actionLoading === "next"}
                        className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.55)] text-[var(--sb-ink)] backdrop-blur hover:bg-[rgba(255,255,255,0.75)]"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      {currentTrack.externalUrl ? (
                        <Button
                          variant="outline"
                          onClick={() => window.open(currentTrack.externalUrl || "https://open.spotify.com", "_blank", "noopener,noreferrer")}
                          className="rounded-full border-[var(--sb-line)] bg-[rgba(255,255,255,0.55)] text-xs text-[var(--sb-ink)] backdrop-blur hover:bg-[rgba(255,255,255,0.75)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in Spotify
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-4 py-8 text-center text-sm text-[var(--sb-ink-3)]">
                    No track is active right now. Search for one above, or start Spotify on another device and Braino can control it here.
                  </div>
                )}
              </div>
            </div>

            {currentTrack ? (
              <div
                className="rounded-[26px] border p-5 backdrop-blur-xl"
                style={{
                  borderColor: "var(--sb-line)",
                  background: "color-mix(in srgb, var(--sb-panel-2) 84%, transparent)",
                  boxShadow: "var(--sb-shadow-sm)",
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-[var(--sb-ink)]">About this song</div>
                    <div className="mt-1 text-[12px] text-[var(--sb-ink-3)]">
                      Song context pulled from the current Spotify player state.
                    </div>
                  </div>
                  {currentTrack.externalUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(currentTrack.externalUrl || "https://open.spotify.com", "_blank", "noopener,noreferrer")}
                      className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {aboutCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        borderColor: "var(--sb-line-2)",
                        background: "color-mix(in srgb, var(--sb-panel) 88%, transparent)",
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--sb-ink-3)]">{card.label}</div>
                      <div className="mt-2 text-sm leading-relaxed text-[var(--sb-ink)]">{card.value}</div>
                    </div>
                  ))}
                </div>

                {spotlightResults.length > 0 ? (
                  <div
                    className="mt-4 rounded-2xl border p-4"
                    style={{
                      borderColor: "var(--sb-line-2)",
                      background: "color-mix(in srgb, var(--sb-panel) 82%, transparent)",
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--sb-ink-3)]">Search spotlight</div>
                    <div className="mt-3 space-y-2">
                      {spotlightResults.map((track, index) => {
                        const isCurrentResult = sameSpotifyTrack(track, currentTrack);

                        return (
                          <div
                            key={track.id || track.uri || `${track.name}-${index}`}
                            className={cn(
                              "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                              isCurrentResult
                                ? "border-[#1ed76033] bg-[#1ed7600f]"
                                : "border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[var(--sb-ink)]">{track.name || "Untitled track"}</div>
                              <div className="truncate text-[12px] text-[var(--sb-ink-3)]">{artistLine(track)}</div>
                            </div>
                            <div className="ml-3 text-[11px] text-[var(--sb-ink-3)]">
                              {isCurrentResult ? "Now playing" : `#${index + 1}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4 text-sm text-[var(--sb-ink-2)]">
                <div className="mb-2 font-medium text-[var(--sb-ink)]">Playback notes</div>
                <div className="space-y-2 text-[13px]">
                  <p>If the browser player doesn&apos;t grab audio right away, hit play once in Spotify or keep a Spotify device open so Braino has somewhere to send playback.</p>
                  <p>Spotify&apos;s browser playback requires Premium. Without it, search and link/open still work, but direct in-browser song playback won&apos;t.</p>
                  <p>Before shipping this broadly, review Spotify&apos;s platform rules for commercial streaming use. Braino can technically control playback here, but policy approval is a separate question.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
