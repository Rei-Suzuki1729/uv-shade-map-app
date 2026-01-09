/**
 * 幾何学計算ユーティリティ
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * 2点間の距離を計算（Haversine公式）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * ポイントがポリゴン内にあるかチェック
 */
export function isPointInsidePolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    if (
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * 最も近いルートポイントのインデックスを見つける
 */
export function findNearestPointIndex(route: Coordinate[], position: Coordinate): number {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < route.length; i++) {
    const dist = calculateDistance(
      position.latitude, position.longitude,
      route[i].latitude, route[i].longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * ルートの総距離を計算
 */
export function calculateRouteDistance(route: Coordinate[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    distance += calculateDistance(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude
    );
  }
  return distance;
}
