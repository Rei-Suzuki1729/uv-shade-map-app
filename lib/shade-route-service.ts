/**
 * 日陰優先ルート計算サービス
 * 建物の影を考慮したルート最適化
 *
 * NOTE: このファイルは後方互換性のために残されています。
 * 新しい実装は lib/routing/ 配下にあります。
 */

// Re-export types and functions from the new modules
export {
  Coordinate,
  calculateDistance
} from './routing/geometry';

export {
  RouteSegment,
  RouteOptions,
  calculateRouteShadePercentage
} from './routing/pathfinder';

export {
  Route,
  generateRouteOptions,
  updateRouteShadeStatus
} from './routing/route-generator';
