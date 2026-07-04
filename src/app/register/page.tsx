'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      // Check if email confirmation is required or if user is immediately logged in
      if (data?.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setSuccessMsg(
          'Registrasi berhasil! Silakan cek kotak masuk email Anda untuk melakukan verifikasi akun.'
        );
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal mendaftar. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex mb-3">
            <img src="/Logo.png" alt="NimeTrack Logo" className="h-12 w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Buat Akun Baru</h2>
          <p className="text-sm text-slate-400 mt-1">Daftar untuk mulai melacak anime Anda</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-500/10 bg-red-950/20 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-500/10 bg-emerald-950/20 p-4 text-sm text-emerald-400">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:bg-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:bg-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Konfirmasi Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan ulang password"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:bg-white/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mendaftar...</span>
              </>
            ) : (
              <span>Daftar Sekarang</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-violet-400 hover:underline">
            Masuk Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
