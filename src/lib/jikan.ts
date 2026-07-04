import { JikanAnime } from '@/types';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

export async function searchAnime(query: string): Promise<JikanAnime[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const response = await fetch(
      `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=15`
    );

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
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
