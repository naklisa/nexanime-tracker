'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { searchAnime } from '@/lib/jikan';
import { JikanAnime } from '@/types';
import { Search, Loader2, X, Plus, AlertCircle } from 'lucide-react';
import { useModalNavigation } from '@/lib/useModalNavigation';

interface AddAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnimeAdded: () => void;
}

export default function AddAnimeModal({ isOpen, onClose, onAnimeAdded }: AddAnimeModalProps) {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JikanAnime[]>([]);

  // ESC key & mobile back button support
  useModalNavigation(isOpen, onClose);
  const [searching, setSearching] = useState(false);

  // Form states for selected anime
  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  const [status, setStatus] = useState<'watching' | 'plan_to_watch' | 'completed'>('watching');
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState(0);
  
  // Streaming link input states
  const [platformName, setPlatformName] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setErrorMsg(null);
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchAnime(searchQuery);
        setSearchResults(results);
      } catch (err) {
        setErrorMsg((err as Error).message || 'Gagal mengambil hasil pencarian.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectAnime = (anime: JikanAnime) => {
    setSelectedAnime(anime);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!selectedAnime) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Pengguna tidak teridentifikasi. Silakan login kembali.');

      // Extract day and time from Jikan broadcast object
      // Jikan API returns broadcast: { day, time, timezone, string }
      const airingDay = selectedAnime.broadcast?.day || null;
      const airingTime = selectedAnime.broadcast?.time 
        ? `${selectedAnime.broadcast.time}:00` // Format: HH:MM:SS
        : null;

      // 1. Insert into anime_tracker
      const { data: trackerData, error: trackerError } = await supabase
        .from('anime_tracker')
        .insert({
          user_id: user.id,
          mal_id: selectedAnime.mal_id,
          title: selectedAnime.title,
          image_url: selectedAnime.images.jpg.large_image_url || selectedAnime.images.jpg.image_url,
          status,
          last_watched_episode: lastWatchedEpisode,
          airing_day: airingDay,
          airing_time: airingTime,
        })
        .select()
        .single();

      if (trackerError) throw trackerError;

      // 2. Insert streaming link if provided
      if (platformName && streamingUrl) {
        const { error: linkError } = await supabase
          .from('streaming_links')
          .insert({
            anime_tracker_id: trackerData.id,
            platform_name: platformName,
            url: streamingUrl,
          });

        if (linkError) throw linkError;
      }

      // Reset & Close
      onAnimeAdded();
      handleClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal menyimpan anime.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAnime(null);
    setStatus('watching');
    setLastWatchedEpisode(0);
    setPlatformName('');
    setStreamingUrl('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Track Anime Baru</h3>
          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/10 bg-red-950/20 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!selectedAnime ? (
            /* Search Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Cari Judul Anime
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    {searching ? (
                      <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Contoh: Demon Slayer, Jujutsu Kaisen..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:bg-white/10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {searchResults.map((anime) => (
                  <div
                    key={anime.mal_id}
                    onClick={() => handleSelectAnime(anime)}
                    className="flex cursor-pointer gap-4 rounded-2xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 hover:border-white/10 transition-all duration-200"
                  >
                    <img
                      src={anime.images.jpg.image_url}
                      alt={anime.title}
                      className="h-16 w-12 rounded object-cover shadow"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-sm text-white truncate">{anime.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {anime.episodes ? `${anime.episodes} Episode` : 'Airing'} • {anime.status}
                      </p>
                      {anime.broadcast?.string && (
                        <p className="text-[10px] text-violet-400 mt-0.5">
                          Jadwal: {anime.broadcast.string}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="rounded-xl bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-400 border border-violet-500/10">
                        Pilih
                      </span>
                    </div>
                  </div>
                ))}

                {searchQuery.trim().length >= 3 && searchResults.length === 0 && !searching && (
                  <div className="text-center py-8 text-sm text-slate-400">
                    Tidak menemukan anime dengan judul tersebut.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Configure Tracker Mode */
            <div className="space-y-5">
              {/* Anime Quick Details */}
              <div className="flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                <img
                  src={selectedAnime.images.jpg.image_url}
                  alt={selectedAnime.title}
                  className="h-20 w-16 rounded-xl object-cover shadow"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                    Anime Terpilih
                  </span>
                  <h4 className="font-bold text-base text-white truncate mt-0.5">
                    {selectedAnime.title}
                  </h4>
                  <button
                    onClick={() => setSelectedAnime(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-white underline mt-1.5 text-left"
                  >
                    Ganti Anime
                  </button>
                </div>
              </div>

              {/* Status & Last Watched */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Status Tonton
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'watching' | 'plan_to_watch' | 'completed')}
                    className="w-full rounded-2xl border border-white/10 bg-[#161a25] py-3 px-4 text-sm text-white outline-none focus:border-violet-500"
                  >
                    <option value="watching">Sedang Menonton (Watching)</option>
                    <option value="plan_to_watch">Rencana Tonton (Plan to Watch)</option>
                    <option value="completed">Selesai Menonton (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Episode Terakhir Ditonton
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={lastWatchedEpisode}
                    onChange={(e) => setLastWatchedEpisode(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Optional Streaming Link */}
              <div className="border-t border-white/5 pt-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Link Streaming Mandiri (Opsional)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hubungkan langsung halaman streaming anime ini agar bisa langsung diklik nantinya.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Platform
                    </label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder="Bstation, Crunchyroll..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Link URL
                    </label>
                    <input
                      type="url"
                      value={streamingUrl}
                      onChange={(e) => setStreamingUrl(e.target.value)}
                      placeholder="https://example.com/watch/..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedAnime && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/5">
            <button
              onClick={handleClose}
              disabled={saving}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Simpan ke Tracker</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
