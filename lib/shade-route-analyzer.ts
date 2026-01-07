/**
 * 日陰優先ルート分析サービス
 * ルート上の日陰率を計算し、日陰の多いルートを推奨
 */

import { Route, RoutePoint, calculateDistance } from './route-service';
import { Building } from './shade-calculator';
import { getSunPosition, calculateAllShadows, isSunAboveHorizon } from './advanced-shade-calculator';

export interface RouteAnalysis {
  route: Route;
  shadePercentage: number; // 日陰率（0-100%）
  shadedDistance: number; // 日陰の距離（メートル）
  exposedDistance: number; // 日向の距離（メートル）
  uvExposure: number; // UV曝露量（相対値）
  isRecommended: boolean;
}

/**
 * ルートの日陰率を分析
 */
export async function analyzeRouteShade(
  route: Route,
  buildings: Building[],
  currentTime: Date = new Date()
): Promise<RouteAnalysis> {
  // 太陽位置を取得
  const sunPosition = getSunPosition(
    currentTime,
    route.geometry[0].latitude,
    route.geometry[0].longitude
  );

  // 太陽が地平線下なら全て日陰
  if (!isSunAboveHorizon(sunPosition)) {
    return {
      route,
      shadePercentage: 100,
      shadedDistance: route.distance,
      exposedDistance: 0,
      uvExposure: 0,
      isRecommended: true,
    };
  }

  // 建物の影を計算
  const shadows = calculateAllShadows(buildings, sunPosition, route.geometry[0].latitude);

  // ルート上の各ポイントで日陰判定
  let shadedDistance = 0;
  let totalDistance = 0;

  for (let i = 0; i < route.geometry.length - 1; i++) {
    const p1 = route.geometry[i];
    const p2 = route.geometry[i + 1];
    const segmentDistance = calculateDistance(p1, p2);
    totalDistance += segmentDistance;

    // セグメントの中点で日陰判定
    const midPoint = {
      latitude: (p1.latitude + p2.latitude) / 2,
      longitude: (p1.longitude + p2.longitude) / 2,
    };

    if (isPointInShade(midPoint, shadows)) {
      shadedDistance += segmentDistance;
    }
  }

  const shadePercentage = totalDistance > 0 ? (shadedDistance / totalDistance) * 100 : 0;
  const exposedDistance = totalDistance - shadedDistance;
  
  // UV曝露量を計算（日向の距離に比例、簡易計算）
  const uvExposure = Math.round((exposedDistance / totalDistance) * 100);

  return {
    route,
    shadePercentage: Math.round(shadePercentage),
    shadedDistance: Math.round(shadedDistance),
    exposedDistance: Math.round(exposedDistance),
    uvExposure,
    isRecommended: shadePercentage > 50, // 50%以上日陰なら推奨
  };
}

/**
 * ポイントが影の中にあるか判定
 */
function isPointInShade(
  point: RoutePoint,
  shadows: Array<{ buildingId: string; coordinates: Array<{ latitude: number; longitude: number }>; opacity: number }>
): boolean {
  for (const shadow of shadows) {
    // coordinatesをpolygon形式に変換
    const polygon = shadow.coordinates.map(c => ({ x: c.longitude, y: c.latitude }));
    if (isPointInPolygon(point, polygon)) {
      return true;
    }
  }
  return false;
}

/**
 * ポイントがポリゴン内にあるか判定（Ray casting algorithm）
 */
function isPointInPolygon(
  point: RoutePoint,
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * 複数のルートを比較し、最適なルートを選択
 */
export function compareRoutes(analyses: RouteAnalysis[]): RouteAnalysis {
  // 日陰率が最も高いルートを推奨
  return analyses.reduce((best, current) => {
    if (current.shadePercentage > best.shadePercentage) {
      return current;
    }
    // 日陰率が同じなら距離が短い方を推奨
    if (
      current.shadePercentage === best.shadePercentage &&
      current.route.distance < best.route.distance
    ) {
      return current;
    }
    return best;
  });
}

/**
 * ルートの推奨度を計算（0-100）
 */
export function calculateRouteScore(analysis: RouteAnalysis): number {
  // 日陰率70%、距離30%の重み付け
  const shadeScore = analysis.shadePercentage * 0.7;
  
  // 距離スコア（短いほど高得点、基準は2km）
  const distanceScore = Math.max(0, 100 - (analysis.route.distance / 2000) * 100) * 0.3;
  
  return Math.round(shadeScore + distanceScore);
}
