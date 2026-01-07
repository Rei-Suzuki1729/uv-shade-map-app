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

const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * 2点間のルートを検索
 */
export async function searchRoute(
  start: RoutePoint,
  end: RoutePoint,
  profile: 'driving' | 'walking' | 'cycling' = 'walking'
): Promise<Route | null> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/${profile}/` +
      `${start.longitude},${start.latitude};` +
      `${end.longitude},${end.latitude}` +
      `?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    
    // GeoJSON座標を変換 (経度, 緯度) -> {latitude, longitude}
    const geometry: RoutePoint[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        longitude: coord[0],
        latitude: coord[1],
      })
    );

    // ステップ情報を変換
    const steps: RouteStep[] = (route.legs[0]?.steps || []).map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      instruction: step.maneuver?.instruction || '',
      coordinates: step.geometry.coordinates.map((coord: [number, number]) => ({
        longitude: coord[0],
        latitude: coord[1],
      })),
    }));

    return {
      distance: route.distance,
      duration: route.duration,
      geometry,
      steps,
    };
  } catch (error) {
    console.error('Route search error:', error);
    return null;
  }
}

/**
 * 複数の経由地を通るルートを検索
 */
export async function searchRouteWithWaypoints(
  points: RoutePoint[],
  profile: 'driving' | 'walking' | 'cycling' = 'walking'
): Promise<Route | null> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required');
  }

  try {
    const coordinates = points
      .map(p => `${p.longitude},${p.latitude}`)
      .join(';');

    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}` +
      `?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    
    const geometry: RoutePoint[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        longitude: coord[0],
        latitude: coord[1],
      })
    );

    // 全てのlegsからstepsを結合
    const steps: RouteStep[] = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        steps.push({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver?.instruction || '',
          coordinates: step.geometry.coordinates.map((coord: [number, number]) => ({
            longitude: coord[0],
            latitude: coord[1],
          })),
        });
      }
    }

    return {
      distance: route.distance,
      duration: route.duration,
      geometry,
      steps,
    };
  } catch (error) {
    console.error('Route search with waypoints error:', error);
    return null;
  }
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
