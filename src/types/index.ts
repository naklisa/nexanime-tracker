export interface AnimeTracker {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  image_url: string;
  status: 'watching' | 'plan_to_watch' | 'completed';
  last_watched_episode: number;
  airing_day: string | null;
  airing_time: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface StreamingLink {
  id: number;
  anime_tracker_id: string;
  platform_name: string;
  url: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  anime_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  anime_tracker?: {
    title: string;
    image_url: string;
  };
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  broadcast: {
    day: string | null;
    time: string | null;
    timezone: string | null;
    string: string | null;
  };
  status: string;
  episodes: number | null;
  synopsis: string | null;
}
