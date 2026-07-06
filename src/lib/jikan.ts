import { JikanAnime } from '@/types';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

export async function searchAnime(query: string): Promise<JikanAnime[]> {
  if (!query || query.trim().length < 3) return [];

  const response = await fetch(
    `/api/search-anime?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal mencari anime (status ${response.status})`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getAnimeDetails(malId: number): Promise<JikanAnime | null> {
  try {
    const response = await fetch(`${JIKAN_BASE_URL}/anime/${malId}`);

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching anime details for MAL ID ${malId}:`, error);
    return null;
  }
}
