/**
 * ジオコーディングサービス
 * 
 * Nominatim (OpenStreetMap) APIを使用して日本語住所検索を提供します。
 * APIキー不要で無料で使用できます。
 * 
 * 利用規約: https://operations.osmfoundation.org/policies/nominatim/
 * - 1秒に1リクエストまで
 * - User-Agentヘッダーの設定が必要
 */

export interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
}

export interface ReverseGeocodingResult {
  displayName: string;
  address: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    road?: string;
    postcode?: string;
  };
}

interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    road?: string;
    postcode?: string;
  };
  boundingbox: string[];
  type: string;
  importance: number;
  name?: string;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'UVShadeMapApp/1.0';

// レート制限のための最後のリクエスト時刻
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1秒

/**
 * レート制限を考慮した待機
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * 日本語住所から座標を検索（ジオコーディング）
 * 
 * @param query 検索クエリ（日本語住所、施設名など）
 * @param limit 結果の最大数（デフォルト: 5）
 * @returns ジオコーディング結果の配列
 */
export async function searchAddress(
  query: string,
  limit: number = 5
): Promise<GeocodingResult[]> {
  await waitForRateLimit();
  
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.append('q', query);
  url.searchParams.append('format', 'json');
  url.searchParams.append('addressdetails', '1');
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('countrycodes', 'jp'); // 日本に限定
  url.searchParams.append('accept-language', 'ja'); // 日本語優先

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data: NominatimResponse[] = await response.json();

    return data.map(item => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));
  } catch (error) {
    console.error('Failed to search address:', error);
    throw error;
  }
}

/**
 * 座標から住所を取得（逆ジオコーディング）
 * 
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 逆ジオコーディング結果
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodingResult> {
  await waitForRateLimit();
  
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.append('lat', latitude.toFixed(6));
  url.searchParams.append('lon', longitude.toFixed(6));
  url.searchParams.append('format', 'json');
  url.searchParams.append('addressdetails', '1');
  url.searchParams.append('accept-language', 'ja'); // 日本語優先

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data: NominatimResponse = await response.json();

    return {
      displayName: data.display_name,
      address: data.address || {},
    };
  } catch (error) {
    console.error('Failed to reverse geocode:', error);
    throw error;
  }
}

/**
 * 日本の主要都市の座標を取得
 * 
 * @param cityName 都市名
 * @returns 座標
 */
export function getJapaneseCityCoordinates(cityName: string): { latitude: number; longitude: number } | null {
  const cities: Record<string, { latitude: number; longitude: number }> = {
    '東京': { latitude: 35.6812, longitude: 139.7671 },
    '大阪': { latitude: 34.6937, longitude: 135.5023 },
    '名古屋': { latitude: 35.1815, longitude: 136.9066 },
    '札幌': { latitude: 43.0642, longitude: 141.3469 },
    '福岡': { latitude: 33.5904, longitude: 130.4017 },
    '京都': { latitude: 35.0116, longitude: 135.7681 },
    '横浜': { latitude: 35.4437, longitude: 139.6380 },
    '神戸': { latitude: 34.6901, longitude: 135.1955 },
    '仙台': { latitude: 38.2682, longitude: 140.8694 },
    '広島': { latitude: 34.3853, longitude: 132.4553 },
  };

  return cities[cityName] || null;
}
