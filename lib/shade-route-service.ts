/**
 * 日陰優先ルート計算サービス
 * 建物の影を考慮したルート最適化
 */

import { Building } from './shade-calculator';
import {
  getSunPosition,
  calculateAllShadows,
  isSunAboveHorizon,
  isPointInShade,
  ShadowPolygon,
} from './advanced-shade-calculator';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  start: Coordinate;
  end: Coordinate;
  distance: number; // メートル
  isInShade: boolean;
  shadePercentage: number;
}

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

export interface RouteOptions {
  prioritizeShade: boolean;
  maxDetour: number; // 最大迂回率（1.0 = 100%）
  walkingSpeed: number; // km/h
}

const DEFAULT_OPTIONS: RouteOptions = {
  prioritizeShade: true,
  maxDetour: 0.3, // 30%まで迂回を許容
  walkingSpeed: 4.5, // 平均歩行速度
};

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
 * ルートの日陰率を計算
 */
export function calculateRouteShadePercentage(
  route: Coordinate[],
  shadows: ShadowPolygon[],
  sampleInterval: number = 10 // メートル
): number {
  if (route.length < 2 || shadows.length === 0) return 0;

  let totalPoints = 0;
  let shadedPoints = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    const segmentDistance = calculateDistance(
      start.latitude, start.longitude,
      end.latitude, end.longitude
    );

    const numSamples = Math.max(1, Math.ceil(segmentDistance / sampleInterval));

    for (let j = 0; j <= numSamples; j++) {
      const t = j / numSamples;
      const samplePoint: Coordinate = {
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude: start.longitude + (end.longitude - start.longitude) * t,
      };

      totalPoints++;
      if (isPointInShade(samplePoint, shadows)) {
        shadedPoints++;
      }
    }
  }

  return totalPoints > 0 ? (shadedPoints / totalPoints) * 100 : 0;
}

/**
 * 直線ルートを生成
 */
function generateDirectRoute(
  start: Coordinate,
  end: Coordinate
): Coordinate[] {
  // 簡易的に直線ルートを生成
  // 実際にはGoogle Directions APIなどを使用
  const numPoints = 20;
  const route: Coordinate[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    route.push({
      latitude: start.latitude + (end.latitude - start.latitude) * t,
      longitude: start.longitude + (end.longitude - start.longitude) * t,
    });
  }

  return route;
}

/**
 * 日陰を優先したルートを生成
 * グリッドベースのA*アルゴリズムを使用
 */
function generateShadeOptimizedRoute(
  start: Coordinate,
  end: Coordinate,
  shadows: ShadowPolygon[],
  buildings: Building[],
  options: RouteOptions
): Coordinate[] {
  // グリッドサイズ（度）
  const gridSize = 0.0001; // 約10m
  
  // 直線距離
  const directDistance = calculateDistance(
    start.latitude, start.longitude,
    end.latitude, end.longitude
  );

  // 探索範囲を計算
  const maxDistance = directDistance * (1 + options.maxDetour);
  const latRange = Math.abs(end.latitude - start.latitude) * 1.5;
  const lonRange = Math.abs(end.longitude - start.longitude) * 1.5;

  // 簡易A*アルゴリズム
  interface Node {
    lat: number;
    lon: number;
    g: number; // 開始からのコスト
    h: number; // ゴールまでの推定コスト
    f: number; // 合計コスト
    parent: Node | null;
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    lat: start.latitude,
    lon: start.longitude,
    g: 0,
    h: directDistance,
    f: directDistance,
    parent: null,
  };

  openSet.push(startNode);

  const getKey = (lat: number, lon: number): string =>
    `${Math.round(lat / gridSize)},${Math.round(lon / gridSize)}`;

  const isNearEnd = (lat: number, lon: number): boolean => {
    const dist = calculateDistance(lat, lon, end.latitude, end.longitude);
    return dist < 20; // 20m以内でゴール
  };

  const getNeighbors = (node: Node): Coordinate[] => {
    const neighbors: Coordinate[] = [];
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    for (const [dLat, dLon] of directions) {
      const newLat = node.lat + dLat * gridSize;
      const newLon = node.lon + dLon * gridSize;

      // 建物内部かチェック（簡易版）
      let isInsideBuilding = false;
      for (const building of buildings) {
        if (isPointInsidePolygon({ latitude: newLat, longitude: newLon }, building.coordinates)) {
          isInsideBuilding = true;
          break;
        }
      }

      if (!isInsideBuilding) {
        neighbors.push({ latitude: newLat, longitude: newLon });
      }
    }

    return neighbors;
  };

  // 日陰コスト係数（日陰は低コスト）
  const getShadeCost = (point: Coordinate): number => {
    if (isPointInShade(point, shadows)) {
      return 0.5; // 日陰は半分のコスト
    }
    return 1.0;
  };

  let iterations = 0;
  const maxIterations = 5000;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // f値が最小のノードを取得
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (isNearEnd(current.lat, current.lon)) {
      // パスを再構築
      const path: Coordinate[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ latitude: node.lat, longitude: node.lon });
        node = node.parent;
      }
      path.push(end);
      return path;
    }

    const currentKey = getKey(current.lat, current.lon);
    if (closedSet.has(currentKey)) continue;
    closedSet.add(currentKey);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = getKey(neighbor.latitude, neighbor.longitude);
      if (closedSet.has(neighborKey)) continue;

      const stepDistance = calculateDistance(
        current.lat, current.lon,
        neighbor.latitude, neighbor.longitude
      );

      // 日陰コストを適用
      const shadeCost = options.prioritizeShade ? getShadeCost(neighbor) : 1.0;
      const g = current.g + stepDistance * shadeCost;

      // 最大迂回距離をチェック
      const totalEstimated = g + calculateDistance(
        neighbor.latitude, neighbor.longitude,
        end.latitude, end.longitude
      );
      if (totalEstimated > maxDistance) continue;

      const h = calculateDistance(
        neighbor.latitude, neighbor.longitude,
        end.latitude, end.longitude
      );

      const existingNode = openSet.find(
        n => getKey(n.lat, n.lon) === neighborKey
      );

      if (!existingNode || g < existingNode.g) {
        const newNode: Node = {
          lat: neighbor.latitude,
          lon: neighbor.longitude,
          g,
          h,
          f: g + h,
          parent: current,
        };

        if (existingNode) {
          const index = openSet.indexOf(existingNode);
          openSet[index] = newNode;
        } else {
          openSet.push(newNode);
        }
      }
    }
  }

  // 最適ルートが見つからない場合は直線ルートを返す
  return generateDirectRoute(start, end);
}

/**
 * ポイントがポリゴン内にあるかチェック
 */
function isPointInsidePolygon(point: Coordinate, polygon: Coordinate[]): boolean {
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
 * ルートの総距離を計算
 */
function calculateRouteDistance(route: Coordinate[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    distance += calculateDistance(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude
    );
  }
  return distance;
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

/**
 * 最も近いルートポイントのインデックスを見つける
 */
function findNearestPointIndex(route: Coordinate[], position: Coordinate): number {
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
