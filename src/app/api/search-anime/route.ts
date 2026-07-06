import { NextRequest, NextResponse } from 'next/server';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const ANILIST_URL = 'https://graphql.anilist.co';
const TIMEOUT_MS = 6000;
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Jikan helpers ──────────────────────────────────────────────────────────
async function fetchJikan(query: string): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(
      `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=15`,
      { headers: { Accept: 'application/json' }, signal: controller.signal, next: { revalidate: 60 } }
    );
  } finally {
    clearTimeout(id);
  }
}

// ── AniList fallback ───────────────────────────────────────────────────────
async function searchViaAniList(query: string) {
  const gql = `
    query ($search: String) {
      Page(perPage: 15) {
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
          idMal
          title { romaji english }
          coverImage { large medium }
          episodes
          status
          nextAiringEpisode { airingAt }
          airingSchedule(notYetAired: false, perPage: 1) {
            nodes { episode airingAt }
          }
        }
      }
    }
  `;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables: { search: query } }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) throw new Error(`AniList error: ${res.status}`);
    const json = await res.json();

    // Map AniList shape → JikanAnime shape
    return (json.data?.Page?.media ?? []).map((m: {
      idMal: number | null;
      title: { romaji: string; english: string | null };
      coverImage: { large: string; medium: string };
      episodes: number | null;
      status: string;
    }) => ({
      mal_id: m.idMal ?? 0,
      title: m.title.english ?? m.title.romaji,
      images: {
        jpg: {
          image_url: m.coverImage.medium,
          large_image_url: m.coverImage.large,
        },
      },
      broadcast: { day: null, time: null, timezone: null, string: null },
      status: m.status,
      episodes: m.episodes,
      synopsis: null,
    }));
  } finally {
    clearTimeout(id);
  }
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ data: [] });
  }

  // 1. Try Jikan (with retry)
  let jikanFailed = false;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchJikan(query);

      if (response.status === 429) {
        // Rate-limited — try AniList instead
        jikanFailed = true;
        break;
      }

      if (response.status === 504 || response.status === 502 || response.status === 503) {
        if (attempt < MAX_RETRIES) { await sleep(800 * attempt); continue; }
        jikanFailed = true;
        break;
      }

      if (!response.ok) {
        jikanFailed = true;
        break;
      }

      const data = await response.json();
      return NextResponse.json({ data: data.data ?? [] });

    } catch (err) {
      const isAbort = (err as Error).name === 'AbortError';
      console.warn(`[search-anime] Jikan attempt ${attempt} failed (${isAbort ? 'timeout' : (err as Error).message})`);
      if (attempt < MAX_RETRIES) await sleep(800 * attempt);
      else jikanFailed = true;
    }
  }

  // 2. Fallback: AniList
  if (jikanFailed) {
    try {
      console.log('[search-anime] Falling back to AniList for query:', query);
      const results = await searchViaAniList(query);
      // Return with a header so the client can optionally show a notice
      return NextResponse.json(
        { data: results, source: 'anilist' },
        { headers: { 'X-Data-Source': 'anilist' } }
      );
    } catch (fallbackErr) {
      console.error('[search-anime] AniList fallback also failed:', fallbackErr);
      return NextResponse.json(
        { error: 'Semua sumber data tidak tersedia saat ini. Coba lagi dalam beberapa menit.' },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Gagal mengambil data anime.' },
    { status: 500 }
  );
}
