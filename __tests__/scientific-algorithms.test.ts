/**
 * 科学的アルゴリズムのテスト
 * 
 * CoolWalks論文とSánchez-Pérez論文に基づくアルゴリズムの検証
 */

import { describe, it, expect } from 'vitest';
import {
  calculateUVIntensity,
  calculateUVDose,
  calculateSafeExposureTime,
  evaluateExposureSafety,
  classifyUVLevel,
  getUVRecommendations,
  calculateEffectiveUVIndex,
} from '../lib/scientific-uv-calculator';
import {
  calculateExperiencedLength,
  calculateRouteExperiencedLength,
  findOptimalShadeRoute,
  calculateCoolWalkability,
  getRecommendedAlpha,
  aggregateRouteInfo,
  Route,
  RouteSegment,
} from '../lib/coolwalks-routing';

describe('Scientific UV Calculator', () => {
  describe('calculateUVIntensity', () => {
    it('UV指数からUV放射強度を正しく計算する（式: I_UV = 15.1 × UVI + 35.5）', () => {
      // UVI = 0
      expect(calculateUVIntensity(0)).toBeCloseTo(35.5, 1);
      // UVI = 5
      expect(calculateUVIntensity(5)).toBeCloseTo(111, 1);
      // UVI = 10
      expect(calculateUVIntensity(10)).toBeCloseTo(186.5, 1);
    });
  });

  describe('calculateUVDose', () => {
    it('UV放射線量を正しく計算する（式: D = I^(4/3) × t_e）', () => {
      const dose = calculateUVDose(5, 60); // UVI=5, 60秒
      expect(dose).toBeGreaterThan(0);
      
      // 同じUVI、長い露出時間 → 高い線量
      const longerDose = calculateUVDose(5, 120);
      expect(longerDose).toBeGreaterThan(dose);
      
      // 高いUVI、同じ露出時間 → 高い線量
      const higherUVDose = calculateUVDose(10, 60);
      expect(higherUVDose).toBeGreaterThan(dose);
    });
  });

  describe('calculateSafeExposureTime', () => {
    it('肌タイプIは最も短い安全露出時間を持つ', () => {
      const uvIndex = 5;
      const typeI = calculateSafeExposureTime(uvIndex, 'I');
      const typeVI = calculateSafeExposureTime(uvIndex, 'VI');
      
      expect(typeI).toBeLessThan(typeVI);
    });

    it('UV指数が高いほど安全露出時間が短くなる', () => {
      const lowUV = calculateSafeExposureTime(2, 'II');
      const highUV = calculateSafeExposureTime(10, 'II');
      
      expect(highUV).toBeLessThan(lowUV);
    });

    it('UV指数0の場合は無限大を返す', () => {
      const result = calculateSafeExposureTime(0, 'II');
      expect(result).toBe(Infinity);
    });
  });

  describe('evaluateExposureSafety', () => {
    it('安全な露出時間内は安全と判定する', () => {
      const result = evaluateExposureSafety(5, 'III', 10);
      expect(result.isSafe).toBe(true);
      expect(result.burnRisk).toBe('none');
    });

    it('安全な露出時間を超えると危険と判定する', () => {
      const result = evaluateExposureSafety(10, 'I', 100);
      expect(result.isSafe).toBe(false);
      expect(['high', 'very_high']).toContain(result.burnRisk);
    });
  });

  describe('classifyUVLevel', () => {
    it('WHO基準に従ってUVレベルを分類する', () => {
      expect(classifyUVLevel(1)).toBe('low');
      expect(classifyUVLevel(3)).toBe('moderate');
      expect(classifyUVLevel(6)).toBe('high');
      expect(classifyUVLevel(9)).toBe('very_high');
      expect(classifyUVLevel(12)).toBe('extreme');
    });
  });

  describe('calculateEffectiveUVIndex', () => {
    it('日陰では実効UV指数が低下する', () => {
      const uvIndex = 10;
      const effectiveInShade = calculateEffectiveUVIndex(uvIndex, 1.0, 'building');
      const effectiveInSun = calculateEffectiveUVIndex(uvIndex, 0.0, 'building');
      
      expect(effectiveInShade).toBeLessThan(effectiveInSun);
    });

    it('建物の日陰は最も効果的なUV軽減を提供する', () => {
      const uvIndex = 10;
      const building = calculateEffectiveUVIndex(uvIndex, 0.5, 'building');
      const tree = calculateEffectiveUVIndex(uvIndex, 0.5, 'tree');
      
      expect(building).toBeLessThan(tree);
    });
  });
});

describe('CoolWalks Routing Algorithm', () => {
  const createTestSegment = (
    id: string,
    sunDistance: number,
    shadeDistance: number
  ): RouteSegment => ({
    id,
    sunDistance,
    shadeDistance,
    totalDistance: sunDistance + shadeDistance,
    shadeRatio: shadeDistance / (sunDistance + shadeDistance),
  });

  const createTestRoute = (
    id: string,
    name: string,
    segments: RouteSegment[]
  ): Route => {
    const aggregated = aggregateRouteInfo(segments);
    return { id, name, segments, ...aggregated };
  };

  describe('calculateExperiencedLength', () => {
    it('α=1の場合、経験的距離は物理的距離と等しい', () => {
      const result = calculateExperiencedLength(100, 100, 1.0);
      expect(result).toBe(200);
    });

    it('α>1の場合、日なた距離が重み付けされる', () => {
      const alpha1 = calculateExperiencedLength(100, 100, 1.0);
      const alpha2 = calculateExperiencedLength(100, 100, 2.0);
      
      expect(alpha2).toBeGreaterThan(alpha1);
      expect(alpha2).toBe(300); // 100*2 + 100
    });

    it('日陰のみのルートはαに影響されない', () => {
      const alpha1 = calculateExperiencedLength(0, 200, 1.0);
      const alpha2 = calculateExperiencedLength(0, 200, 2.0);
      
      expect(alpha1).toBe(alpha2);
      expect(alpha1).toBe(200);
    });
  });

  describe('findOptimalShadeRoute', () => {
    it('α=1の場合、最短ルートが選択される', () => {
      const routes: Route[] = [
        createTestRoute('1', '最短', [createTestSegment('s1', 150, 50)]),
        createTestRoute('2', '日陰多め', [createTestSegment('s2', 50, 200)]),
      ];

      const result = findOptimalShadeRoute(routes, 1.0);
      expect(result.optimalRoute.id).toBe('1');
    });

    it('α=2の場合、日陰の多いルートが選択される', () => {
      const routes: Route[] = [
        createTestRoute('1', '最短', [createTestSegment('s1', 150, 50)]),
        createTestRoute('2', '日陰多め', [createTestSegment('s2', 50, 200)]),
      ];

      const result = findOptimalShadeRoute(routes, 2.0);
      // ルート1: 150*2 + 50 = 350
      // ルート2: 50*2 + 200 = 300
      expect(result.optimalRoute.id).toBe('2');
    });

    it('ランキングが正しく計算される', () => {
      const routes: Route[] = [
        createTestRoute('1', 'A', [createTestSegment('s1', 100, 100)]),
        createTestRoute('2', 'B', [createTestSegment('s2', 50, 150)]),
        createTestRoute('3', 'C', [createTestSegment('s3', 150, 50)]),
      ];

      const result = findOptimalShadeRoute(routes, 1.5);
      expect(result.rankings.length).toBe(3);
      expect(result.rankings[result.optimalIndex]).toBe(1);
    });
  });

  describe('calculateCoolWalkability', () => {
    it('日陰率が高いルートは高いCoolWalkabilityスコアを持つ', () => {
      const shortestRoute = createTestRoute('1', '最短', [
        createTestSegment('s1', 180, 20),
      ]);
      const shadedRoute = createTestRoute('2', '日陰', [
        createTestSegment('s2', 50, 200),
      ]);

      const result = calculateCoolWalkability(shadedRoute, shortestRoute, 1.5);
      
      expect(result.shadeRatio).toBeGreaterThan(0.5);
      expect(result.coolWalkabilityScore).toBeGreaterThan(50);
    });

    it('最短ルートとの比較情報が正しく計算される', () => {
      const shortestRoute = createTestRoute('1', '最短', [
        createTestSegment('s1', 100, 100),
      ]);
      const longerRoute = createTestRoute('2', '長め', [
        createTestSegment('s2', 50, 200),
      ]);

      const result = calculateCoolWalkability(longerRoute, shortestRoute, 1.5);
      
      expect(result.comparisonToShortest.distanceIncrease).toBe(50);
      expect(result.comparisonToShortest.shadeImprovement).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedAlpha', () => {
    it('UV指数が高いほど高いαを推奨する', () => {
      const lowUV = getRecommendedAlpha(2, 3);
      const highUV = getRecommendedAlpha(10, 3);
      
      expect(highUV).toBeGreaterThan(lowUV);
    });

    it('敏感な肌タイプほど高いαを推奨する', () => {
      const sensitiveType = getRecommendedAlpha(5, 1);
      const resistantType = getRecommendedAlpha(5, 6);
      
      expect(sensitiveType).toBeGreaterThan(resistantType);
    });

    it('αは1.0以上の値を返す', () => {
      const result = getRecommendedAlpha(1, 6);
      expect(result).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('aggregateRouteInfo', () => {
    it('セグメント情報を正しく集計する', () => {
      const segments: RouteSegment[] = [
        createTestSegment('s1', 100, 50),
        createTestSegment('s2', 50, 100),
      ];

      const result = aggregateRouteInfo(segments);
      
      expect(result.totalDistance).toBe(300);
      expect(result.totalSunDistance).toBe(150);
      expect(result.totalShadeDistance).toBe(150);
      expect(result.shadeRatio).toBe(0.5);
    });

    it('推定所要時間を正しく計算する', () => {
      const segments: RouteSegment[] = [
        createTestSegment('s1', 400, 100), // 500m
      ];

      const result = aggregateRouteInfo(segments);
      
      // 500m / 83.3 m/min ≈ 6分
      expect(result.estimatedTime).toBeGreaterThan(5);
      expect(result.estimatedTime).toBeLessThan(8);
    });
  });
});
