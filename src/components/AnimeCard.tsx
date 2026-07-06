'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AnimeTracker } from '@/types';
import { Tv, Plus, ChevronRight } from 'lucide-react';

interface AnimeCardProps {
  anime: AnimeTracker;
  onUpdate: () => void;
}

export default function AnimeCard({ anime, onUpdate }: AnimeCardProps) {
  const supabase = createClient();
  const [episode, setEpisode] = useState(anime.last_watched_episode);
  const [updating, setUpdating] = useState(false);

  const incrementEpisode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (updating) return;

    setUpdating(true);
    const nextEpisode = episode + 1;
    
    try {
      const { error } = await supabase
        .from('anime_tracker')
        .update({ last_watched_episode: nextEpisode })
        .eq('id', anime.id);

      if (error) throw error;
      setEpisode(nextEpisode);
      onUpdate();
    } catch (err) {
      console.error('Error incrementing episode:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Convert English airing day to Indonesian
  // Jikan returns plural form e.g. "Fridays" — strip trailing 's' before lookup
  const getIndonesianDay = (day: string | null) => {
    if (!day) return null;
    const days: Record<string, string> = {
      sunday: 'Minggu',
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
    };
    const normalized = day.toLowerCase().replace(/s$/, '');
    return days[normalized] || day;
  };

  const statusColors = {
    watching: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    plan_to_watch: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  };

  const statusLabels = {
    watching: 'Watching',
    plan_to_watch: 'Plan to Watch',
    completed: 'Completed',
  };

  return (
    <div className="glass group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 glow-on-hover flex flex-col h-full">
      {/* Anime Image Cover */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
        {anime.image_url ? (
          <img
            src={anime.image_url}
            alt={anime.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-700">
            <Tv className="h-12 w-12" />
          </div>
        )}

        {/* Status Badge Over Image */}
        <span className={`absolute left-3 top-3 rounded-xl border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${statusColors[anime.status]}`}>
          {statusLabels[anime.status]}
        </span>

        {/* Quick Increment Episode Overlay */}
        {anime.status !== 'completed' && (
          <button
            onClick={incrementEpisode}
            disabled={updating}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-500 active:scale-90 disabled:opacity-50"
            title="Tambah episode tontonan"
          >
            <Plus className={`h-5 w-5 ${updating ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Info Content */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-white text-sm sm:text-base tracking-wide line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-violet-400 transition-colors">
            {anime.title}
          </h4>

          {/* Schedule Info */}
          {anime.airing_day && (
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 flex items-center gap-1 sm:gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0"></span>
              <span className="truncate">
                Rilis: {getIndonesianDay(anime.airing_day)}
                {anime.airing_time ? ` pukul ${anime.airing_time.slice(0, 5)}` : ''}
              </span>
            </p>
          )}
        </div>

        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Progres
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              Eps {episode}
            </span>
          </div>

          <Link
            href={`/anime/${anime.id}`}
            className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-bold text-violet-400 group-hover:text-violet-300 hover:underline"
          >
            <span>Detail</span>
            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
