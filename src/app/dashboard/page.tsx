'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnimeTracker } from '@/types';
import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import AddAnimeModal from '@/components/AddAnimeModal';
import { Loader2, Plus, Compass, Search, ArrowUpDown } from 'lucide-react';

type StatusFilter = 'all' | 'watching' | 'plan_to_watch' | 'completed';
type SortOption = 'newest' | 'oldest' | 'az' | 'za';

export default function DashboardPage() {
  const supabase = createClient();
  const [animeList, setAnimeList] = useState<AnimeTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetchAnimeList = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('anime_tracker')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimeList(data || []);
    } catch (err) {
      console.error('Error fetching tracked anime:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAnimeList();
  }, [fetchAnimeList]);

  const filteredAndSorted = useMemo(() => {
    let list = animeList;

    // Status filter
    if (filter !== 'all') list = list.filter((a) => a.status === filter);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...list];
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'za') sorted.sort((a, b) => b.title.localeCompare(a.title));

    return sorted;
  }, [animeList, filter, searchQuery, sortBy]);

  const getStats = () => {
    const total = animeList.length;
    const watching = animeList.filter((a) => a.status === 'watching').length;
    const plan = animeList.filter((a) => a.status === 'plan_to_watch').length;
    const completed = animeList.filter((a) => a.status === 'completed').length;
    return { total, watching, plan, completed };
  };

  const stats = getStats();

  return (
    <div className="flex min-h-screen flex-col pb-12">
      <Navbar onOpenAddModal={() => setAddModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Pelacakan</h1>
            <p className="text-sm text-slate-400 mt-1">Pantau dan kelola jadwal tontonan anime Anda</p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95 sm:hidden"
          >
            <Plus className="h-4 w-4" />
            <span>Track Anime Baru</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Anime</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1">{stats.total}</span>
          </div>
          <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col justify-center border-l-2 border-l-blue-500">
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-wider">Watching</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1">{stats.watching}</span>
          </div>
          <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col justify-center border-l-2 border-l-amber-500">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wider">Plan to Watch</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1">{stats.plan}</span>
          </div>
          <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col justify-center border-l-2 border-l-emerald-500">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1">{stats.completed}</span>
          </div>
        </div>

        {/* Filter Bar + Search + Sort */}
        <div className="mb-8 space-y-4 border-b border-white/5 pb-5">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {(['all', 'watching', 'plan_to_watch', 'completed'] as const).map((type) => {
              const label = { all: 'Semua', watching: 'Sedang Ditonton', plan_to_watch: 'Rencana Tonton', completed: 'Selesai' }[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold transition-all ${
                    filter === type
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-900/10'
                      : 'border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search + Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul anime..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:bg-white/10"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none w-full sm:w-auto rounded-2xl border border-white/10 bg-[#161a25] py-2.5 pl-10 pr-10 text-sm text-white outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="newest">Terbaru Ditambahkan</option>
                <option value="oldest">Terlama Ditambahkan</option>
                <option value="az">Judul A–Z</option>
                <option value="za">Judul Z–A</option>
              </select>
            </div>
          </div>

          {/* Result count hint */}
          {(searchQuery.trim() || filter !== 'all') && (
            <p className="text-xs text-slate-500">
              Menampilkan <span className="text-violet-400 font-semibold">{filteredAndSorted.length}</span> dari {animeList.length} anime
            </p>
          )}
        </div>

        {/* Main Loading / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-slate-400">Memuat daftar anime...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center border-dashed border-2 border-white/5 mt-6">
            <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 mb-6">
              {searchQuery.trim() ? (
                <Search className="h-8 w-8 text-violet-500/80" />
              ) : (
                <Compass className="h-8 w-8 text-violet-500/80 animate-pulse" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchQuery.trim() ? 'Anime Tidak Ditemukan' : 'Belum Ada Anime'}
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">
              {searchQuery.trim()
                ? `Tidak ada anime dengan judul "${searchQuery}" di daftar kamu.`
                : filter === 'all'
                ? 'Daftar pelacakan Anda kosong. Mulai tambahkan anime yang sedang Anda tonton sekarang!'
                : `Tidak ada anime dengan status "${
                    { watching: 'Sedang Ditonton', plan_to_watch: 'Rencana Tonton', completed: 'Selesai' }[filter]
                  }".`}
            </p>
            {!searchQuery.trim() && filter === 'all' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Track Anime Pertamamu</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-6">
            {filteredAndSorted.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onUpdate={fetchAnimeList} />
            ))}
          </div>
        )}
      </main>

      <AddAnimeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAnimeAdded={fetchAnimeList}
      />
    </div>
  );
}
