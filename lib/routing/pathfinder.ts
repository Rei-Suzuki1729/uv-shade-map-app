/**
 * 経路探索ロジック
 */

import { Building } from '../shade-calculator';
import { ShadowPolygon, isPointInShade } from '../advanced-shade-calculator';
import {
  Coordinate,
  calculateDistance,
  isPointInsidePolygon
} from './geometry';

export interface RouteSegment {
  start: Coordinate;
  end: Coordinate;
  distance: number; // メートル
  isInShade: boolean;
  shadePercentage: number;
}

export interface RouteOptions {
  prioritizeShade: boolean;
  maxDetour: number; // 最大迂回率（1.0 = 100%）
  walkingSpeed: number; // km/h
}

export const DEFAULT_OPTIONS: RouteOptions = {
  prioritizeShade: true,
  maxDetour: 0.3, // 30%まで迂回を許容
  walkingSpeed: 4.5, // 平均歩行速度
};

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
export function generateDirectRoute(
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
export function generateShadeOptimizedRoute(
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
  // latRange, lonRange はこの実装では使用されていないが、元のコードにはあった

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
