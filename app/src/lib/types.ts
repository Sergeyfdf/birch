export type Source = 'youtube' | 'soundcloud' | 'local';

export type RemoteTrack = {
  id: string;
  sourceId: string;
  source: Exclude<Source, 'local'>;
  url: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  artwork: string | null;
};

export type Track = {
  id: string;
  source: Source;
  url?: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: number | null;
  file: string;
  artwork?: string | null;
  size?: number;
  addedAt: number;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type RepeatMode = 'off' | 'all' | 'one';
