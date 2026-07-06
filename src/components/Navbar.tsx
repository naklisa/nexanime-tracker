'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DbNotification } from '@/types';
import { Bell, LogOut, Plus, Trash2, Circle, Smartphone, BellRing, Loader2, CalendarDays } from 'lucide-react';
import { useModalNavigation } from '@/lib/useModalNavigation';

interface NavbarProps {
  onOpenAddModal?: () => void;
}

export default function Navbar({ onOpenAddModal }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasPushPermission, setHasPushPermission] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // ESC key & mobile back button support for notification dropdown
  useModalNavigation(isOpen, () => setIsOpen(false));

  useEffect(() => {
    if ('Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      const { subscribeToPushNotifications } = await import('@/lib/push');
      const sub = await subscribeToPushNotifications();
      
      // Save subscription in DB
      const res = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan subscription ke server.');
      }

      setHasPushPermission(true);
      alert('Notifikasi HP berhasil diaktifkan!');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Gagal mengaktifkan notifikasi HP.');
    } finally {
      setPushLoading(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*, anime_tracker(title, image_url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      const formatted = (data || []).map((n) => {
        const item = n as unknown as {
          id: string;
          user_id: string;
          anime_id: string | null;
          message: string;
          is_read: boolean;
          created_at: string;
          anime_tracker: { title: string; image_url: string } | null;
        };
        return {
          id: item.id,
          user_id: item.user_id,
          anime_id: item.anime_id,
          message: item.message,
          is_read: item.is_read,
          created_at: item.created_at,
          anime_tracker: item.anime_tracker ? {
            title: item.anime_tracker.title,
            image_url: item.anime_tracker.image_url
          } : undefined
        };
      }) as DbNotification[];

      setNotifications(formatted);
      setUnreadCount(formatted.filter((n) => !n.is_read).length);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();

    // Setup realtime subscription to public.notifications
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as DbNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchNotifications]);

  useEffect(() => {
    // Close dropdown on click outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking read:', error);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
    } else {
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all read:', error);
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <nav className="glass-nav sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2.5 text-xl font-bold tracking-wider text-violet-400">
              <img src="/Logo.png" alt="NimeTrack Logo" className="h-8 w-auto object-contain" />
              <span>NIME<span className="text-emerald-400">TRACK</span></span>
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/schedule"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Jadwal</span>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-500 hover:shadow-violet-800/40 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Track Anime</span>
              </button>
            )}

            {/* Enable Push Button */}
            <button
              onClick={handleEnablePush}
              disabled={pushLoading || hasPushPermission}
              className={`rounded-xl border p-2.5 transition-all active:scale-95 disabled:pointer-events-none flex items-center justify-center gap-1.5 ${
                hasPushPermission
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              title={hasPushPermission ? 'Notifikasi HP Aktif' : 'Aktifkan Notifikasi HP'}
            >
              {pushLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : hasPushPermission ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
              <span className="hidden md:inline text-xs font-semibold">
                {hasPushPermission ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi HP'}
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black ring-2 ring-[#0b0c10]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isOpen && (
                <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 mt-2 md:w-96 rounded-2xl border border-white/10 bg-[#161a25]/95 p-2 shadow-2xl backdrop-blur-xl transition-all">
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                    <h3 className="text-sm font-bold text-white">Notifikasi Rilis</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-emerald-400 hover:underline"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Bell className="h-8 w-8 text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400">Tidak ada notifikasi saat ini.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            handleMarkAsRead(notif.id);
                            setIsOpen(false);
                            if (notif.anime_id) router.push(`/anime/${notif.anime_id}`);
                          }}
                          className={`group flex cursor-pointer gap-3 rounded-xl p-3 transition-all hover:bg-white/5 ${
                            !notif.is_read ? 'bg-violet-950/20' : ''
                          }`}
                        >
                          {notif.anime_tracker?.image_url && (
                            <img
                              src={notif.anime_tracker.image_url}
                              alt=""
                              className="h-12 w-9 rounded object-cover shadow-md"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs text-slate-200 ${!notif.is_read ? 'font-semibold text-white' : ''}`}>
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-2 justify-center">
                            {!notif.is_read && (
                              <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                            )}
                            <button
                              onClick={(e) => handleDeleteNotification(notif.id, e)}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition-all hover:bg-red-950/20 hover:border-red-900/30 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
