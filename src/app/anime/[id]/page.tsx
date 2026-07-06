'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAnimeDetails } from '@/lib/jikan';
import { AnimeTracker, StreamingLink, JikanAnime } from '@/types';
import Navbar from '@/components/Navbar';
import ConfirmModal from '@/components/ConfirmModal';
import { Loader2, ArrowLeft, Plus, Trash2, Tv, ExternalLink, AlertCircle, CheckCircle, Save } from 'lucide-react';

export default function AnimeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  // Helper: Jikan returns plural form e.g. "Fridays" — normalize before lookup
  const getIndonesianDay = (day: string | null) => {
    if (!day) return null;
    const days: Record<string, string> = {
      sunday: 'Minggu', monday: 'Senin', tuesday: 'Selasa',
      wednesday: 'Rabu', thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu',
    };
    const normalized = day.toLowerCase().replace(/s$/, '');
    return days[normalized] || day;
  };

  // Database states
  const [tracker, setTracker] = useState<AnimeTracker | null>(null);
  const [links, setLinks] = useState<StreamingLink[]>([]);
  
  // API state
  const [animeDetails, setAnimeDetails] = useState<JikanAnime | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [savingTracker, setSavingTracker] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Tracker editing state
  const [status, setStatus] = useState<'watching' | 'plan_to_watch' | 'completed'>('watching');
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState(0);

  // New Link form state
  const [platformName, setPlatformName] = useState('');
  const [url, setUrl] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch tracker from Supabase
      const { data: trackerData, error: trackerError } = await supabase
        .from('anime_tracker')
        .select('*')
        .eq('id', id)
        .single();

      if (trackerError) throw trackerError;
      setTracker(trackerData);
      setStatus(trackerData.status);
      setLastWatchedEpisode(trackerData.last_watched_episode);

      // 2. Fetch streaming links
      const { data: linksData, error: linksError } = await supabase
        .from('streaming_links')
        .select('*')
        .eq('anime_tracker_id', id)
        .order('created_at', { ascending: true });

      if (linksError) throw linksError;
      setLinks(linksData || []);

      // 3. Fetch Jikan API Details
      const details = await getAnimeDetails(trackerData.mal_id);
      if (details) {
        setAnimeDetails(details);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'Gagal memuat detail anime.');
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const handleUpdateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTracker(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('anime_tracker')
        .update({
          status,
          last_watched_episode: lastWatchedEpisode,
        })
        .eq('id', id);

      if (error) throw error;
      setSuccessMsg('Progres tontonan berhasil disimpan.');
      if (tracker) {
        setTracker({ ...tracker, status, last_watched_episode: lastWatchedEpisode });
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal memperbarui progres.');
    } finally {
      setSavingTracker(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || !url) return;
    setAddingLink(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('streaming_links')
        .insert({
          anime_tracker_id: id,
          platform_name: platformName,
          url,
        })
        .select()
        .single();

      if (error) throw error;
      setLinks([...links, data]);
      setPlatformName('');
      setUrl('');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal menambahkan link streaming.');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('streaming_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      setLinks(links.filter((l) => l.id !== linkId));
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal menghapus link streaming.');
    }
  };

  const handleDeleteTracker = async () => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('anime_tracker')
        .delete()
        .eq('id', id);

      if (error) throw error;
      router.push('/dashboard');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal menghapus tracker anime.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-3" />
          <p className="text-sm text-slate-400">Memuat rincian anime...</p>
        </div>
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Anime Tidak Ditemukan</h2>
          <p className="text-sm text-slate-400 mb-6">
            Data pelacakan tidak ada atau Anda tidak memiliki akses untuk melihat anime ini.
          </p>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-bold text-violet-400 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Kembalilah ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <Navbar />

      {/* Banner Backdrop */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden bg-slate-950/80 border-b border-white/5">
        {animeDetails?.images.jpg.large_image_url && (
          <img
            src={animeDetails.images.jpg.large_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] to-transparent"></div>
        <div className="absolute bottom-6 left-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <Link href="/dashboard" className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-slate-300 transition-all hover:bg-black/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
            Detail Anime
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Anime Poster & Jikan Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-3xl p-6 flex flex-col items-center">
              <img
                src={tracker.image_url || animeDetails?.images.jpg.large_image_url}
                alt={tracker.title}
                className="w-full max-w-[200px] sm:max-w-[240px] aspect-[3/4] object-cover rounded-2xl shadow-xl border border-white/5"
              />
              <h2 className="text-xl font-bold text-center mt-5 text-white">
                {tracker.title}
              </h2>
              {animeDetails && (
                <div className="w-full mt-6 space-y-3.5 text-xs border-t border-white/5 pt-5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Status Rilis</span>
                    <span className="text-slate-200 font-semibold">{animeDetails.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Episode</span>
                    <span className="text-slate-200 font-semibold">
                      {animeDetails.episodes || 'Masih Berlangsung (Airing)'}
                    </span>
                  </div>
                  {tracker.airing_day && (
                    <div className="flex justify-between">
                      <span>Jadwal Tayang</span>
                      <span className="text-violet-400 font-semibold">
                        {getIndonesianDay(tracker.airing_day)}
                        {tracker.airing_time ? ` @ ${tracker.airing_time.slice(0, 5)}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Synopsis */}
            {animeDetails?.synopsis && (
              <div className="glass rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Sinopsis
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-h-48 overflow-y-auto pr-1">
                  {animeDetails.synopsis}
                </p>
              </div>
            )}

            {/* Danger Zone */}
            <div className="glass rounded-3xl p-6 border-red-500/10 bg-red-950/5">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">
                Hentikan Pelacakan
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Hapus anime ini dari daftar tontonan Anda beserta semua streaming links-nya.
              </p>
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full rounded-2xl bg-red-900/20 border border-red-500/20 py-3 text-xs font-bold text-red-400 hover:bg-red-900/40 transition-all active:scale-95"
              >
                Hapus dari Tracker
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Manage Tracker & Streaming Links */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/10 bg-red-950/20 p-4 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/10 bg-emerald-950/20 p-4 text-sm text-emerald-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Section 1: Update Progress Form */}
            <div className="glass rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-5">Perbarui Progres Tonton</h3>
              
              <form onSubmit={handleUpdateTracker} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Status Menonton
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'watching' | 'plan_to_watch' | 'completed')}
                      className="w-full rounded-2xl border border-white/10 bg-[#161a25] py-3.5 px-4 text-sm text-white outline-none focus:border-violet-500"
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
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingTracker}
                    className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {savingTracker ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Simpan Progres</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Manage Streaming Links */}
            <div className="glass rounded-3xl p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">Link Streaming Mandiri</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tambahkan dan kelola URL langsung ke halaman pemutar streaming resmi (atau alternatif) untuk anime ini.
                </p>
              </div>

              {/* Streaming Links List */}
              <div className="space-y-3 mb-8">
                {links.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-white/5 rounded-2xl">
                    Belum ada link streaming yang ditambahkan.
                  </div>
                ) : (
                  links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-violet-600/10 text-violet-400">
                          <Tv className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white">{link.platform_name}</h4>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 truncate hover:text-violet-400 flex items-center gap-1 mt-0.5"
                          >
                            <span className="truncate max-w-[120px] min-[380px]:max-w-[180px] sm:max-w-xs">{link.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-red-950/20 hover:text-red-400 transition-all active:scale-90"
                        title="Hapus Link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Link Form */}
              <div className="border-t border-white/5 pt-6">
                <h4 className="text-sm font-bold text-white mb-4">Tambah Link Streaming</h4>
                <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      required
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder="Bstation, Netlfix, dll"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Direct URL Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/..."
                        className="w-full flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                      />
                      <button
                        type="submit"
                        disabled={addingLink}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {addingLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>
      </main>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        title="Hentikan Pelacakan?"
        message={`Apakah kamu yakin ingin berhenti melacak "${tracker?.title}"? Seluruh data progres dan link streaming akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        dangerous
        onConfirm={() => { setConfirmDeleteOpen(false); handleDeleteTracker(); }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
