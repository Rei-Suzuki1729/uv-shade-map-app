/**
 * ルート生成ロジック
 */

import { Building } from '../shade-calculator';
import {
  getSunPosition,
  calculateAllShadows,
  isSunAboveHorizon,
  isPointInShade,
} from '../advanced-shade-calculator';
import {
  Coordinate,
  calculateDistance,
  findNearestPointIndex,
  calculateRouteDistance
} from './geometry';
import {
  RouteSegment,
  DEFAULT_OPTIONS,
  calculateRouteShadePercentage,
  generateShadeOptimizedRoute,
  generateDirectRoute
} from './pathfinder';

export interface Route {
  id: string;
  name: string;
  segments: RouteSegment[];
  totalDistance: number;
  estimatedDuration: number; // 分
  shadePercentage: number;
  uvExposure: number;
  coordinates: Coordinate[];
}

/**
 * 複数のルートオプションを生成
 */
export async function generateRouteOptions(
  start: Coordinate,
  end: Coordinate,
  buildings: Building[],
  time: Date = new Date()
): Promise<Route[]> {
  // 太陽位置と影を計算
  const sunPosition = getSunPosition(time, start.latitude, start.longitude);
  const shadows = isSunAboveHorizon(sunPosition)
    ? calculateAllShadows(buildings, sunPosition, start.latitude)
    : [];

  const directDistance = calculateDistance(
    start.latitude, start.longitude,
    end.latitude, end.longitude
  );

  const routes: Route[] = [];

  // 1. 日陰優先ルート
  const shadeRoute = generateShadeOptimizedRoute(
    start, end, shadows, buildings,
    { ...DEFAULT_OPTIONS, prioritizeShade: true, maxDetour: 0.3 }
  );
  const shadeRouteDistance = calculateRouteDistance(shadeRoute);
  const shadePercentage = calculateRouteShadePercentage(shadeRoute, shadows);

  routes.push({
    id: 'shade-priority',
    name: '日陰優先ルート',
    segments: [],
    totalDistance: Math.round(shadeRouteDistance),
    estimatedDuration: Math.round(shadeRouteDistance / (DEFAULT_OPTIONS.walkingSpeed * 1000 / 60)),
    shadePercentage: Math.round(shadePercentage),
    uvExposure: Math.round(100 - shadePercentage),
    coordinates: shadeRoute,
  });

  // 2. バランスルート
  const balancedRoute = generateShadeOptimizedRoute(
    start, end, shadows, buildings,
    { ...DEFAULT_OPTIONS, prioritizeShade: true, maxDetour: 0.15 }
  );
  const balancedRouteDistance = calculateRouteDistance(balancedRoute);
  const balancedShadePercentage = calculateRouteShadePercentage(balancedRoute, shadows);

  routes.push({
    id: 'balanced',
    name: 'バランスルート',
    segments: [],
    totalDistance: Math.round(balancedRouteDistance),
    estimatedDuration: Math.round(balancedRouteDistance / (DEFAULT_OPTIONS.walkingSpeed * 1000 / 60)),
    shadePercentage: Math.round(balancedShadePercentage),
    uvExposure: Math.round(100 - balancedShadePercentage),
    coordinates: balancedRoute,
  });

  // 3. 最短ルート
  const directRoute = generateDirectRoute(start, end);
  const directShadePercentage = calculateRouteShadePercentage(directRoute, shadows);

  routes.push({
    id: 'fastest',
    name: '最短ルート',
    segments: [],
    totalDistance: Math.round(directDistance),
    estimatedDuration: Math.round(directDistance / (DEFAULT_OPTIONS.walkingSpeed * 1000 / 60)),
    shadePercentage: Math.round(directShadePercentage),
    uvExposure: Math.round(100 - directShadePercentage),
    coordinates: directRoute,
  });

  // 日陰率でソート（高い順）
  routes.sort((a, b) => b.shadePercentage - a.shadePercentage);

  // 最も日陰率が高いルートを推奨としてマーク
  if (routes.length > 0) {
    routes[0].name = '日陰優先ルート（推奨）';
  }

  return routes;
}

/**
 * リアルタイムで日陰状態を更新
 */
export function updateRouteShadeStatus(
  route: Route,
  currentPosition: Coordinate,
  buildings: Building[],
  time: Date = new Date()
): {
  isCurrentlyInShade: boolean;
  remainingShadePercentage: number;
  nextShadeDistance: number | null;
} {
  const sunPosition = getSunPosition(time, currentPosition.latitude, currentPosition.longitude);
  const shadows = isSunAboveHorizon(sunPosition)
    ? calculateAllShadows(buildings, sunPosition, currentPosition.latitude)
    : [];

  const isCurrentlyInShade = isPointInShade(currentPosition, shadows);

  // 残りのルートの日陰率を計算
  const currentIndex = findNearestPointIndex(route.coordinates, currentPosition);
  const remainingRoute = route.coordinates.slice(currentIndex);
  const remainingShadePercentage = calculateRouteShadePercentage(remainingRoute, shadows);

  // 次の日陰までの距離を計算
  let nextShadeDistance: number | null = null;
  if (!isCurrentlyInShade) {
    for (let i = currentIndex; i < route.coordinates.length; i++) {
      if (isPointInShade(route.coordinates[i], shadows)) {
        nextShadeDistance = calculateDistance(
          currentPosition.latitude, currentPosition.longitude,
          route.coordinates[i].latitude, route.coordinates[i].longitude
        );
        break;
      }
    }
  }

  return {
    isCurrentlyInShade,
    remainingShadePercentage,
    nextShadeDistance,
  };
}
