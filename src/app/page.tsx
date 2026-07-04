import Link from 'next/link';
import { Tv, Flame, Play, Bell, Shield, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-bold tracking-wider text-violet-400">
          <Tv className="h-6 w-6 text-violet-500 animate-pulse" />
          <span>NIME<span className="text-emerald-400">TRACK</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white transition-all"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95"
          >
            Daftar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 max-w-5xl mx-auto text-center py-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 px-3.5 py-1.5 text-xs font-semibold text-violet-400 mb-6">
          <Flame className="h-4 w-4 fill-violet-400" />
          <span>Anime Tracking Platform Modern</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white mb-6 leading-tight">
          Track Anime Pilihanmu & <br className="hidden sm:inline" />
          Dapatkan <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">Notifikasi Rilis</span> Instan
        </h1>

        <p className="max-w-2xl text-lg text-slate-400 mb-10">
          Kelola daftar tontonanmu, hubungkan link streaming favoritmu sendiri secara mandiri, dan terima notifikasi in-app otomatis begitu episode terbaru rilis!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-500 hover:shadow-violet-800/50 active:scale-95 w-full sm:w-auto justify-center group"
          >
            <span>Mulai Sekarang</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-slate-200 transition-all hover:bg-white/10 hover:text-white w-full sm:w-auto justify-center"
          >
            <span>Masuk ke Akun</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          <div className="glass rounded-3xl p-6 text-left hover:border-violet-500/30 transition-all duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 mb-4">
              <Play className="h-5 w-5 fill-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Track & Progress</h3>
            <p className="text-sm text-slate-400">
              Pantau progres tontonanmu untuk tiap anime. Update episode dengan cepat dalam satu klik.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 text-left hover:border-violet-500/30 transition-all duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-400 mb-4">
              <Bell className="h-5 w-5 fill-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Notifikasi In-App</h3>
            <p className="text-sm text-slate-400">
              Sistem akan memantau waktu rilis anime kamu dan mengirimkan notifikasi instan langsung di aplikasi.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 text-left hover:border-violet-500/30 transition-all duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 mb-4">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Multi-Streaming Link</h3>
            <p className="text-sm text-slate-400">
              Tambahkan link platform streaming mana saja (Bstation, Crunchyroll, dll) agar bisa ditonton dalam sekali klik.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500 w-full mt-12">
        <p>&copy; {new Date().getFullYear()} NimeTrack. Made with love for anime lovers.</p>
      </footer>
    </div>
  );
}
