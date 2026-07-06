'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnimeTracker } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Loader2, CalendarDays, Clock, ChevronRight, Tv } from 'lucide-react';

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_EN_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export default function SchedulePage() {
  const supabase = createClient();
  const [animeList, setAnimeList] = useState<AnimeTracker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnime = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('anime_tracker')
        .select('*')
        .not('airing_day', 'is', null)
        .in('status', ['watching', 'plan_to_watch'])
        .order('airing_time', { ascending: true });
      if (error) throw error;
      setAnimeList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchAnime(); }, [fetchAnime]);

  // Today's day index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const todayIdx = new Date().getDay();
  // Build week starting from today
  const weekOrder = Array.from({ length: 7 }, (_, i) => (todayIdx + i) % 7);

  // Group anime by normalized day index
  const grouped: Record<number, AnimeTracker[]> = {};
  DAYS_EN_KEYS.forEach((_, idx) => { grouped[idx] = []; });
  animeList.forEach((anime) => {
    if (!anime.airing_day) return;
    const normalized = anime.airing_day.toLowerCase().replace(/s$/, '');
    const idx = DAYS_EN_KEYS.indexOf(normalized);
    if (idx >= 0) grouped[idx].push(anime);
  });

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-violet-600/10 text-violet-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Jadwal Minggu Ini</h1>
          </div>
          <p className="text-sm text-slate-400 ml-[3.25rem]">
            Anime yang tayang minggu ini — diurutkan mulai hari ini
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-slate-400">Memuat jadwal...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {weekOrder.map((dayIdx) => {
              const dayAnime = grouped[dayIdx];
              const isToday = dayIdx === todayIdx;
              const isTomorrow = dayIdx === (todayIdx + 1) % 7;

              return (
                <div key={dayIdx} className={`glass rounded-3xl overflow-hidden transition-all ${isToday ? 'border-violet-500/30 shadow-lg shadow-violet-900/10' : ''}`}>
                  {/* Day Header */}
                  <div className={`flex items-center justify-between px-5 py-3.5 border-b border-white/5 ${isToday ? 'bg-violet-600/10' : 'bg-white/3'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-base font-extrabold tracking-wide ${isToday ? 'text-violet-400' : 'text-white'}`}>
                        {DAYS_ID[dayIdx]}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-violet-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                          Hari Ini
                        </span>
                      )}
                      {isTomorrow && (
                        <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Besok
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${dayAnime.length > 0 ? 'text-violet-400' : 'text-slate-600'}`}>
                      {dayAnime.length} anime
                    </span>
                  </div>

                  {/* Anime List */}
                  {dayAnime.length === 0 ? (
                    <div className="px-5 py-5 text-center text-sm text-slate-600">
                      Tidak ada anime yang tayang
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {dayAnime.map((anime) => (
                        <Link
                          key={anime.id}
                          href={`/anime/${anime.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-all group"
                        >
                          {/* Cover */}
                          <div className="h-12 w-9 shrink-0 rounded-lg overflow-hidden bg-slate-900 shadow">
                            {anime.image_url ? (
                              <img src={anime.image_url} alt={anime.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-700">
                                <Tv className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-400 transition-colors">
                              {anime.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {anime.airing_time && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {anime.airing_time.slice(0, 5)} WIB
                                </span>
                              )}
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                anime.status === 'watching'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {anime.status === 'watching' ? 'Watching' : 'Plan to Watch'}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
