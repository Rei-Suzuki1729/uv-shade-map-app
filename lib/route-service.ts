/**
 * ルート検索サービス
 * OSRM (Open Source Routing Machine) APIを使用
 * APIキー不要、完全無料
 */

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  distance: number; // メートル
  duration: number; // 秒
  instruction: string;
  coordinates: RoutePoint[];
}

export interface Route {
  distance: number; // メートル
  duration: number; // 秒
  geometry: RoutePoint[]; // ルート全体の座標
  steps: RouteStep[];
}

import { getApiBaseUrl } from '@/constants/oauth';

/**
 * 2点間のルートを検索（server経由）
 */
export async function searchRoute(
  start: RoutePoint,
  end: RoutePoint,
  profile: 'driving' | 'walking' | 'cycling' = 'walking'
): Promise<Route | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/trpc/routes.search`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        start: {
          latitude: start.latitude,
          longitude: start.longitude,
        },
        end: {
          latitude: end.latitude,
          longitude: end.longitude,
        },
        profile,
      }),
    });

    if (!response.ok) {
      throw new Error(`Route API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.result?.data?.success || !data.result.data.route) {
      return null;
    }

    return data.result.data.route;
  } catch (error) {
    console.error('Route search error:', error);
    return null;
  }
}

/**
 * 複数の経由地を通るルートを検索
 * TODO: server側にwaypointsエンドポイントを追加後に実装
 */
export async function searchRouteWithWaypoints(
  points: RoutePoint[],
  profile: 'driving' | 'walking' | 'cycling' = 'walking'
): Promise<Route | null> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required');
  }

  console.warn('searchRouteWithWaypoints is not yet implemented via server');
  return null;
}

/**
 * ルートの距離を計算（メートル）
 */
export function calculateRouteDistance(points: RoutePoint[]): number {
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    totalDistance += calculateDistance(p1, p2);
  }

  return totalDistance;
}

/**
 * 2点間の距離を計算（メートル）
 * Haversine formula
 */
export function calculateDistance(p1: RoutePoint, p2: RoutePoint): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (p1.latitude * Math.PI) / 180;
  const φ2 = (p2.latitude * Math.PI) / 180;
  const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 距離を人間が読みやすい形式に変換
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 時間を人間が読みやすい形式に変換
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}時間${remainingMinutes}分`;
}
