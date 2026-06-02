/// <reference types="vite/client" />

interface SpotifyPlayerInit {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
  enableMediaSession?: boolean;
}

interface SpotifyTrackWindowTrack {
  uri?: string;
  id?: string;
  name?: string;
  duration_ms?: number;
  artists?: Array<{ name?: string }>;
  album?: {
    name?: string;
    images?: Array<{ url?: string }>;
  };
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track?: SpotifyTrackWindowTrack;
  };
}

interface SpotifyWebPlaybackPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (payload: any) => void) => boolean;
  removeListener: (event: string, callback?: (payload: any) => void) => boolean;
  activateElement?: () => Promise<void>;
}

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: {
    Player: new (config: SpotifyPlayerInit) => SpotifyWebPlaybackPlayer;
  };
}
