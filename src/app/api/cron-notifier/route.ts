import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Konfigurasi VAPID untuk Web Push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:shavana@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(request: Request) {
  // Inisialisasi Supabase Admin Client menggunakan Service Role Key agar bisa bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  try {
    // 1. Dapatkan Hari ini dalam format JST (Japan Standard Time)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const jstTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const currentDayJST = days[jstTime.getDay()]; // e.g. "Sunday"

    console.log(`Menjalankan cron-notifier untuk hari JST: ${currentDayJST}`);

    // 2. Query ke Supabase untuk mendapatkan semua anime yang tayang hari ini
    const { data: activeTrackers, error: trackerError } = await supabaseAdmin
      .from('anime_tracker')
      .select('*')
      .ilike('airing_day', `%${currentDayJST}%`);

    if (trackerError) throw trackerError;

    if (!activeTrackers || activeTrackers.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tidak ada anime yang tayang pada hari ${currentDayJST} JST.`,
        notifications_sent: 0,
      });
    }

    let notificationsSent = 0;
    const timeLimit = new Date();
    timeLimit.setHours(timeLimit.getHours() - 20); // Limit 20 jam ke belakang untuk pencegahan duplikasi

    // 3. Iterasi setiap anime yang rilis hari ini
    for (const anime of activeTrackers) {
      // Periksa apakah notifikasi untuk anime ini dan user ini sudah dikirim dalam 20 jam terakhir
      const { data: existingNotif, error: notifCheckError } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', anime.user_id)
        .eq('anime_id', anime.id)
        .gt('created_at', timeLimit.toISOString())
        .limit(1);

      if (notifCheckError) {
        console.error('Gagal memeriksa notifikasi duplikat:', notifCheckError);
        continue;
      }

      // Jika belum pernah dikirim dalam 20 jam terakhir, buat notifikasi baru
      if (!existingNotif || existingNotif.length === 0) {
        const message = `Episode baru untuk anime "${anime.title}" tayang hari ini (${getIndonesianDay(anime.airing_day)} ${anime.airing_time ? 'pukul ' + anime.airing_time.slice(0, 5) : ''})!`;

        // a. Simpan in-app notification
        const { error: insertError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: anime.user_id,
            anime_id: anime.id,
            message,
            is_read: false,
          });

        if (insertError) {
          console.error(`Gagal menyimpan notifikasi in-app untuk user ${anime.user_id}:`, insertError);
          continue;
        }

        notificationsSent++;

        // b. Ambil semua token push subscription milik user ini
        const { data: subscriptions, error: subError } = await supabaseAdmin
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', anime.user_id);

        if (subError) {
          console.error(`Gagal memuat push subscriptions untuk user ${anime.user_id}:`, subError);
          continue;
        }

        // c. Kirim notifikasi Web Push
        if (subscriptions && subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: 'Episode Baru Rilis! 📺',
            body: message,
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(request.url).origin : ''}/anime/${anime.id}`,
            icon: anime.image_url || '/favicon.ico',
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload
              );
            } catch (pushErr) {
              console.error('Gagal mengirim Web Push:', pushErr);
              const errorObj = pushErr as { statusCode?: number };
              // Jika token kedaluwarsa atau diblokir (status 410 Gone), hapus dari database
              if (errorObj.statusCode === 410 || errorObj.statusCode === 404) {
                await supabaseAdmin
                  .from('push_subscriptions')
                  .delete()
                  .eq('id', sub.id);
                console.log(`Hapus push subscription kedaluwarsa ID: ${sub.id}`);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pengecekan jadwal selesai.`,
      notifications_sent: notificationsSent,
    });
  } catch (err) {
    console.error('Error pada cron notifier:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Helper Translate Hari
function getIndonesianDay(day: string | null) {
  if (!day) return '';
  const days: Record<string, string> = {
    sunday: 'Minggu',
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    friday: 'Jumat',
    saturday: 'Sabtu',
  };
  return days[day.replace(/s$/, '').toLowerCase()] || day;
}
