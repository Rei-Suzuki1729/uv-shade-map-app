/**
 * CoolWalks日陰優先ルーティングアルゴリズム
 * 
 * 参考文献:
 * Wolf, H., Vierø, A.R. & Szell, M. (2025)
 * "CoolWalks for active mobility in urban street networks"
 * Scientific Reports 15, Article number: 14911
 * 
 * このアルゴリズムは、日光回避パラメータ α を使用して
 * 歩行者が「経験的に」最短と感じるルートを計算します。
 */

export interface RouteSegment {
  /** セグメントID */
  id: string;
  /** 日なたを歩く距離（メートル） */
  sunDistance: number;
  /** 日陰を歩く距離（メートル） */
  shadeDistance: number;
  /** 総距離（メートル） */
  totalDistance: number;
  /** 日陰率（0-1） */
  shadeRatio: number;
}

export interface Route {
  /** ルートID */
  id: string;
  /** ルート名 */
  name: string;
  /** ルートを構成するセグメント */
  segments: RouteSegment[];
  /** 総距離（メートル） */
  totalDistance: number;
  /** 日なた総距離（メートル） */
  totalSunDistance: number;
  /** 日陰総距離（メートル） */
  totalShadeDistance: number;
  /** 日陰率（0-1） */
  shadeRatio: number;
  /** 推定所要時間（分） */
  estimatedTime: number;
}

export interface CoolWalkabilityResult {
  /** 経験的距離 */
  experiencedLength: number;
  /** 物理的距離 */
  physicalLength: number;
  /** 日陰率 */
  shadeRatio: number;
  /** CoolWalkabilityスコア（0-100） */
  coolWalkabilityScore: number;
  /** 最短ルートとの比較 */
  comparisonToShortest: {
    distanceIncrease: number;  // メートル
    distanceIncreasePercent: number;  // パーセント
    shadeImprovement: number;  // パーセントポイント
  };
}

/**
 * 経験的距離を計算
 * 
 * 式: λ_ij = l_ij^sun × α + l_ij^shade
 * 
 * @param sunDistance 日なたを歩く距離（メートル）
 * @param shadeDistance 日陰を歩く距離（メートル）
 * @param alpha 日光回避パラメータ（1.0 = 日光を気にしない、2.0+ = 日陰を強く優先）
 * @returns 経験的距離
 */
export function calculateExperiencedLength(
  sunDistance: number,
  shadeDistance: number,
  alpha: number
): number {
  // CoolWalks論文の式(1)に基づく
  return sunDistance * alpha + shadeDistance;
}

/**
 * ルートの経験的距離を計算
 * 
 * 式: Λ_i→j^α(Π_i→j) = Σ_{ab∈Π_i→j} λ_ab
 * 
 * @param route ルート
 * @param alpha 日光回避パラメータ
 * @returns 経験的距離
 */
export function calculateRouteExperiencedLength(
  route: Route,
  alpha: number
): number {
  return route.segments.reduce((total, segment) => {
    return total + calculateExperiencedLength(
      segment.sunDistance,
      segment.shadeDistance,
      alpha
    );
  }, 0);
}

/**
 * 最適な日陰ルートを選択
 * 
 * 式: Π_i→j* = argmin(Λ_i→j^α(Π_i→j))
 * 
 * @param routes 候補ルートのリスト
 * @param alpha 日光回避パラメータ
 * @returns 最適ルートのインデックスと詳細情報
 */
export function findOptimalShadeRoute(
  routes: Route[],
  alpha: number
): {
  optimalIndex: number;
  optimalRoute: Route;
  experiencedLengths: number[];
  rankings: number[];
} {
  if (routes.length === 0) {
    throw new Error('少なくとも1つのルートが必要です');
  }

  // 各ルートの経験的距離を計算
  const experiencedLengths = routes.map(route => 
    calculateRouteExperiencedLength(route, alpha)
  );

  // 最小の経験的距離を持つルートを見つける
  let minExperienced = Infinity;
  let optimalIndex = 0;

  experiencedLengths.forEach((length, index) => {
    if (length < minExperienced) {
      minExperienced = length;
      optimalIndex = index;
    }
  });

  // ランキングを計算
  const sortedIndices = experiencedLengths
    .map((length, index) => ({ length, index }))
    .sort((a, b) => a.length - b.length)
    .map(item => item.index);

  const rankings = new Array(routes.length);
  sortedIndices.forEach((originalIndex, rank) => {
    rankings[originalIndex] = rank + 1;
  });

  return {
    optimalIndex,
    optimalRoute: routes[optimalIndex],
    experiencedLengths,
    rankings,
  };
}

/**
 * CoolWalkabilityスコアを計算
 * 
 * このスコアは、日陰ルーティングによる恩恵を0-100のスケールで表します。
 * 
 * @param route ルート
 * @param shortestRoute 最短ルート（比較用）
 * @param alpha 日光回避パラメータ
 * @returns CoolWalkabilityの詳細結果
 */
export function calculateCoolWalkability(
  route: Route,
  shortestRoute: Route,
  alpha: number
): CoolWalkabilityResult {
  const experiencedLength = calculateRouteExperiencedLength(route, alpha);
  const shortestExperienced = calculateRouteExperiencedLength(shortestRoute, alpha);
  
  // 日陰率の計算
  const shadeRatio = route.totalShadeDistance / route.totalDistance;
  const shortestShadeRatio = shortestRoute.totalShadeDistance / shortestRoute.totalDistance;
  
  // CoolWalkabilityスコア（日陰率と距離効率の組み合わせ）
  // 高い日陰率 + 短い経験的距離 = 高いスコア
  const shadeScore = shadeRatio * 100;
  const efficiencyScore = Math.max(0, 100 - (experiencedLength / shortestExperienced - 1) * 100);
  const coolWalkabilityScore = Math.round((shadeScore * 0.6 + efficiencyScore * 0.4));
  
  return {
    experiencedLength,
    physicalLength: route.totalDistance,
    shadeRatio,
    coolWalkabilityScore: Math.min(100, Math.max(0, coolWalkabilityScore)),
    comparisonToShortest: {
      distanceIncrease: route.totalDistance - shortestRoute.totalDistance,
      distanceIncreasePercent: ((route.totalDistance / shortestRoute.totalDistance) - 1) * 100,
      shadeImprovement: (shadeRatio - shortestShadeRatio) * 100,
    },
  };
}

/**
 * 推奨される日光回避パラメータ α を取得
 * 
 * UV指数と肌タイプに基づいて、適切な α 値を推奨します。
 * 
 * @param uvIndex 現在のUV指数
 * @param skinTypeSensitivity 肌の感度（1-6、1が最も敏感）
 * @returns 推奨される α 値
 */
export function getRecommendedAlpha(
  uvIndex: number,
  skinTypeSensitivity: number
): number {
  // 基本 α 値（UV指数に基づく）
  let baseAlpha = 1.0;
  
  if (uvIndex <= 2) {
    baseAlpha = 1.0;  // 低UV: 日陰を気にしない
  } else if (uvIndex <= 5) {
    baseAlpha = 1.3;  // 中程度: やや日陰を優先
  } else if (uvIndex <= 7) {
    baseAlpha = 1.6;  // 高: 日陰を優先
  } else if (uvIndex <= 10) {
    baseAlpha = 2.0;  // 非常に高: 強く日陰を優先
  } else {
    baseAlpha = 2.5;  // 極端: 最大限日陰を優先
  }
  
  // 肌タイプによる調整（敏感な肌ほど α を増加）
  const sensitivityMultiplier = 1 + (7 - skinTypeSensitivity) * 0.1;
  
  return Math.round(baseAlpha * sensitivityMultiplier * 10) / 10;
}

/**
 * ルートの日陰情報を集計
 * 
 * @param segments ルートセグメント
 * @returns 集計されたルート情報
 */
export function aggregateRouteInfo(segments: RouteSegment[]): Omit<Route, 'id' | 'name' | 'segments'> {
  const totalDistance = segments.reduce((sum, s) => sum + s.totalDistance, 0);
  const totalSunDistance = segments.reduce((sum, s) => sum + s.sunDistance, 0);
  const totalShadeDistance = segments.reduce((sum, s) => sum + s.shadeDistance, 0);
  
  // 歩行速度: 約 5 km/h = 83.3 m/min
  const walkingSpeedMPerMin = 83.3;
  const estimatedTime = Math.round(totalDistance / walkingSpeedMPerMin);
  
  return {
    totalDistance,
    totalSunDistance,
    totalShadeDistance,
    shadeRatio: totalDistance > 0 ? totalShadeDistance / totalDistance : 0,
    estimatedTime,
  };
}

/**
 * ルート比較サマリーを生成
 * 
 * @param routes 比較するルート
 * @param alpha 日光回避パラメータ
 * @returns 比較サマリー
 */
export function generateRouteComparisonSummary(
  routes: Route[],
  alpha: number
): {
  shortestRoute: Route;
  shadedRoute: Route;
  comparison: {
    distanceDifference: number;
    timeDifference: number;
    shadeImprovement: number;
    uvExposureReduction: number;
  };
} {
  // 最短ルートを見つける
  const shortestRoute = routes.reduce((shortest, route) => 
    route.totalDistance < shortest.totalDistance ? route : shortest
  );
  
  // 最適な日陰ルートを見つける
  const { optimalRoute: shadedRoute } = findOptimalShadeRoute(routes, alpha);
  
  const distanceDifference = shadedRoute.totalDistance - shortestRoute.totalDistance;
  const timeDifference = shadedRoute.estimatedTime - shortestRoute.estimatedTime;
  const shadeImprovement = (shadedRoute.shadeRatio - shortestRoute.shadeRatio) * 100;
  
  // UV露出削減率の推定（日陰は約85%のUV軽減と仮定）
  const shortestUVExposure = shortestRoute.totalSunDistance + shortestRoute.totalShadeDistance * 0.15;
  const shadedUVExposure = shadedRoute.totalSunDistance + shadedRoute.totalShadeDistance * 0.15;
  const uvExposureReduction = ((shortestUVExposure - shadedUVExposure) / shortestUVExposure) * 100;
  
  return {
    shortestRoute,
    shadedRoute,
    comparison: {
      distanceDifference,
      timeDifference,
      shadeImprovement,
      uvExposureReduction: Math.max(0, uvExposureReduction),
    },
  };
}
