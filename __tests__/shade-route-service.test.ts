/**
 * 日陰優先ルートサービスのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateRouteShadePercentage,
  generateRouteOptions,
  updateRouteShadeStatus,
  Coordinate,
} from '../lib/shade-route-service';
import { Building } from '../lib/shade-calculator';

describe('距離計算', () => {
  it('同じ地点間の距離は0', () => {
    const distance = calculateDistance(35.6812, 139.7671, 35.6812, 139.7671);
    expect(distance).toBe(0);
  });

  it('東京駅から皇居までの距離は約1km', () => {
    // 東京駅: 35.6812, 139.7671
    // 皇居: 35.6852, 139.7528
    const distance = calculateDistance(35.6812, 139.7671, 35.6852, 139.7528);
    expect(distance).toBeGreaterThan(800);
    expect(distance).toBeLessThan(1500);
  });

  it('距離は常に正の値', () => {
    const distance = calculateDistance(35.0, 139.0, 36.0, 140.0);
    expect(distance).toBeGreaterThan(0);
  });

  it('距離は対称的（A→BとB→Aは同じ）', () => {
    const distanceAB = calculateDistance(35.6812, 139.7671, 35.6852, 139.7528);
    const distanceBA = calculateDistance(35.6852, 139.7528, 35.6812, 139.7671);
    expect(Math.abs(distanceAB - distanceBA)).toBeLessThan(0.01);
  });
});

describe('ルートの日陰率計算', () => {
  const sampleRoute: Coordinate[] = [
    { latitude: 35.6812, longitude: 139.7671 },
    { latitude: 35.6815, longitude: 139.7675 },
    { latitude: 35.6818, longitude: 139.7678 },
  ];

  it('影がない場合は0%', () => {
    const percentage = calculateRouteShadePercentage(sampleRoute, []);
    expect(percentage).toBe(0);
  });

  it('日陰率は0-100の範囲', () => {
    const sampleShadow = {
      buildingId: 'test',
      coordinates: [
        { latitude: 35.6810, longitude: 139.7670 },
        { latitude: 35.6820, longitude: 139.7670 },
        { latitude: 35.6820, longitude: 139.7680 },
        { latitude: 35.6810, longitude: 139.7680 },
      ],
      opacity: 0.7,
    };

    const percentage = calculateRouteShadePercentage(sampleRoute, [sampleShadow]);
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  it('ルートが短すぎる場合は0%', () => {
    const shortRoute: Coordinate[] = [{ latitude: 35.6812, longitude: 139.7671 }];
    const percentage = calculateRouteShadePercentage(shortRoute, []);
    expect(percentage).toBe(0);
  });
});

describe('ルートオプション生成', () => {
  const start: Coordinate = { latitude: 35.6812, longitude: 139.7671 };
  const end: Coordinate = { latitude: 35.6830, longitude: 139.7690 };
  const buildings: Building[] = [
    {
      id: 'building-1',
      coordinates: [
        { latitude: 35.6815, longitude: 139.7675 },
        { latitude: 35.6817, longitude: 139.7675 },
        { latitude: 35.6817, longitude: 139.7678 },
        { latitude: 35.6815, longitude: 139.7678 },
      ],
      height: 30,
    },
  ];

  it('3つのルートオプションを生成', async () => {
    const routes = await generateRouteOptions(start, end, buildings);
    expect(routes.length).toBe(3);
  });

  it('各ルートに必要なプロパティがある', async () => {
    const routes = await generateRouteOptions(start, end, buildings);
    
    for (const route of routes) {
      expect(route.id).toBeTruthy();
      expect(route.name).toBeTruthy();
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedDuration).toBeGreaterThan(0);
      expect(route.shadePercentage).toBeGreaterThanOrEqual(0);
      expect(route.shadePercentage).toBeLessThanOrEqual(100);
      expect(route.uvExposure).toBeGreaterThanOrEqual(0);
      expect(route.uvExposure).toBeLessThanOrEqual(100);
      expect(route.coordinates.length).toBeGreaterThan(0);
    }
  });

  it('日陰率とUV露出の合計は100%', async () => {
    const routes = await generateRouteOptions(start, end, buildings);
    
    for (const route of routes) {
      expect(route.shadePercentage + route.uvExposure).toBe(100);
    }
  });

  it('ルートは日陰率の高い順にソートされている', async () => {
    const routes = await generateRouteOptions(start, end, buildings);
    
    for (let i = 0; i < routes.length - 1; i++) {
      expect(routes[i].shadePercentage).toBeGreaterThanOrEqual(routes[i + 1].shadePercentage);
    }
  });
});

describe('リアルタイム日陰状態更新', () => {
  const sampleRoute = {
    id: 'test-route',
    name: 'テストルート',
    segments: [],
    totalDistance: 500,
    estimatedDuration: 7,
    shadePercentage: 50,
    uvExposure: 50,
    coordinates: [
      { latitude: 35.6812, longitude: 139.7671 },
      { latitude: 35.6815, longitude: 139.7675 },
      { latitude: 35.6818, longitude: 139.7678 },
    ],
  };

  const buildings: Building[] = [
    {
      id: 'building-1',
      coordinates: [
        { latitude: 35.6815, longitude: 139.7675 },
        { latitude: 35.6817, longitude: 139.7675 },
        { latitude: 35.6817, longitude: 139.7678 },
        { latitude: 35.6815, longitude: 139.7678 },
      ],
      height: 30,
    },
  ];

  it('現在位置の日陰状態を返す', () => {
    const currentPosition: Coordinate = { latitude: 35.6812, longitude: 139.7671 };
    const status = updateRouteShadeStatus(sampleRoute, currentPosition, buildings);
    
    expect(typeof status.isCurrentlyInShade).toBe('boolean');
    expect(status.remainingShadePercentage).toBeGreaterThanOrEqual(0);
    expect(status.remainingShadePercentage).toBeLessThanOrEqual(100);
  });

  it('日なたにいる場合、次の日陰までの距離を返す', () => {
    const currentPosition: Coordinate = { latitude: 35.6812, longitude: 139.7671 };
    const status = updateRouteShadeStatus(sampleRoute, currentPosition, buildings);
    
    if (!status.isCurrentlyInShade && status.nextShadeDistance !== null) {
      expect(status.nextShadeDistance).toBeGreaterThan(0);
    }
  });
});
