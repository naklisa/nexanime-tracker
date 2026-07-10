# NIME<span style="color:#10b981">TRACK</span> 📺

**NimeTrack** adalah platform pelacakan (tracking) anime modern yang memungkinkan Anda mengelola daftar tontonan anime, menghubungkan link streaming mandiri, menandai anime favorit, serta menerima notifikasi *in-app* dan *Web Push* instan begitu episode terbaru rilis berdasarkan waktu siaran Jepang (JST).

---

## ✨ Fitur Utama

- 📊 **Dashboard Pelacakan**: Kelola progress menonton Anda (status *Watching*, *Plan to Watch*, dan *Completed*).
- 🧹 **Pemisahan Daftar Selesai**: Anime yang telah ditandai *Completed* otomatis disaring keluar dari list *Semua* agar dashboard tetap rapi dan terfokus pada anime aktif.
- ❤️ **Fitur Favorit**: Tandai anime pilihan Anda dengan ikon hati yang estetik dan filter secara instan melalui tab *Favorit* khusus.
- 🔗 **Link Streaming Mandiri**: Tambahkan platform streaming favorit Anda (seperti Bstation, Crunchyroll, Netflix, dll.) secara mandiri pada tiap detail anime agar bisa ditonton dalam sekali klik.
- 🔔 **Notifikasi Rilis Akurat**: Sistem akan mencocokkan waktu siaran anime di Jepang (JST) secara otomatis dan mengirim notifikasi *web push* langsung ke browser/HP Anda tepat saat waktu tayang tiba.
- ⚡ **Realtime Updates**: Notifikasi di-update secara realtime menggunakan channel publik Supabase.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Tailwind CSS)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL & Realtime Subscription)
- **API**: [Jikan API](https://jikan.moe/) (Unofficial MyAnimeList API)
- **Notification Engine**: [Web Push](https://www.npmjs.com/package/web-push) (Service Worker & Push API)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Struktur Database (Supabase)

Agar aplikasi berfungsi dengan baik, pastikan tabel-tabel berikut sudah dibuat di database Supabase Anda:

### 1. `anime_tracker`
Menyimpan data anime yang sedang dilacak oleh user.
```sql
CREATE TABLE anime_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  status TEXT CHECK (status IN ('watching', 'plan_to_watch', 'completed')) DEFAULT 'watching',
  last_watched_episode INTEGER DEFAULT 0,
  airing_day TEXT,
  airing_time TIME,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. `streaming_links`
Menyimpan link streaming mandiri yang ditambahkan oleh user.
```sql
CREATE TABLE streaming_links (
  id BIGSERIAL PRIMARY KEY,
  anime_tracker_id UUID REFERENCES anime_tracker(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 3. `notifications`
Menyimpan notifikasi internal (in-app) untuk rilis episode anime.
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id UUID REFERENCES anime_tracker(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 4. `push_subscriptions`
Menyimpan token push subscription browser user untuk Web Push.
```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## ⚙️ Cara Memulai & Konfigurasi

### 1. Kloning & Install Dependensi
```bash
git clone <repository-url>
cd AnimeList
npm install
```

### 2. Setup Environment Variables
Buat file `.env.local` di root folder dan isi konfigurasi berikut:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# VAPID Keys for Web Push (bisa digenerate via npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Jalankan Development Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## ⏰ Konfigurasi Cron Job (Produksi)

Untuk mengirimkan notifikasi rilis secara otomatis setiap jam, project ini menggunakan konfigurasi Vercel Cron yang didefinisikan dalam [vercel.json](file:///d:/S7/AnimeList/vercel.json). 

Saat di-deploy di Vercel, schedule `0 * * * *` akan otomatis terdaftar dan memicu endpoint GET `/api/cron-notifier` secara berkala untuk memproses antrean notifikasi anime yang tayang pada jam tersebut.
