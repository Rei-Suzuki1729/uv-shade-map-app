/**
 * 日陰計算ロジックのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  getSunPosition,
  isSunAboveHorizon,
  calculateBuildingShadow,
  calculateAllShadows,
  isPointInShade,
  calculateShadePercentage,
  calculateUVReduction,
  getSunTimes,
} from '../lib/advanced-shade-calculator';
import { Building } from '../lib/shade-calculator';

describe('太陽位置の計算', () => {
  it('正午の太陽高度は正の値', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const position = getSunPosition(noon, 35.6812, 139.7671); // 東京
    
    expect(position.altitude).toBeGreaterThan(0);
    expect(position.altitudeDegrees).toBeGreaterThan(0);
    expect(position.altitudeDegrees).toBeLessThanOrEqual(90);
  });

  it('深夜の太陽高度は負の値', () => {
    const midnight = new Date('2024-06-21T00:00:00+09:00');
    const position = getSunPosition(midnight, 35.6812, 139.7671);
    
    expect(position.altitude).toBeLessThan(0);
  });

  it('方位角は0-360度の範囲', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const position = getSunPosition(noon, 35.6812, 139.7671);
    
    expect(position.azimuthDegrees).toBeGreaterThanOrEqual(0);
    expect(position.azimuthDegrees).toBeLessThan(360);
  });
});

describe('太陽が地平線上にあるかの判定', () => {
  it('正午は地平線上', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const position = getSunPosition(noon, 35.6812, 139.7671);
    
    expect(isSunAboveHorizon(position)).toBe(true);
  });

  it('深夜は地平線下', () => {
    const midnight = new Date('2024-06-21T00:00:00+09:00');
    const position = getSunPosition(midnight, 35.6812, 139.7671);
    
    expect(isSunAboveHorizon(position)).toBe(false);
  });
});

describe('建物の影の計算', () => {
  const sampleBuilding: Building = {
    id: 'test-building',
    coordinates: [
      { latitude: 35.6812, longitude: 139.7671 },
      { latitude: 35.6813, longitude: 139.7671 },
      { latitude: 35.6813, longitude: 139.7672 },
      { latitude: 35.6812, longitude: 139.7672 },
    ],
    height: 30,
  };

  it('昼間は影が生成される', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const sunPosition = getSunPosition(noon, 35.6812, 139.7671);
    const shadow = calculateBuildingShadow(sampleBuilding, sunPosition, 35.6812);
    
    expect(shadow).not.toBeNull();
    expect(shadow!.coordinates.length).toBeGreaterThan(0);
    expect(shadow!.buildingId).toBe('test-building');
  });

  it('夜間は影が生成されない', () => {
    const midnight = new Date('2024-06-21T00:00:00+09:00');
    const sunPosition = getSunPosition(midnight, 35.6812, 139.7671);
    const shadow = calculateBuildingShadow(sampleBuilding, sunPosition, 35.6812);
    
    expect(shadow).toBeNull();
  });

  it('影の不透明度は0-1の範囲', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const sunPosition = getSunPosition(noon, 35.6812, 139.7671);
    const shadow = calculateBuildingShadow(sampleBuilding, sunPosition, 35.6812);
    
    expect(shadow!.opacity).toBeGreaterThanOrEqual(0);
    expect(shadow!.opacity).toBeLessThanOrEqual(1);
  });
});

describe('複数建物の影の計算', () => {
  const buildings: Building[] = [
    {
      id: 'building-1',
      coordinates: [
        { latitude: 35.6812, longitude: 139.7671 },
        { latitude: 35.6813, longitude: 139.7671 },
        { latitude: 35.6813, longitude: 139.7672 },
        { latitude: 35.6812, longitude: 139.7672 },
      ],
      height: 30,
    },
    {
      id: 'building-2',
      coordinates: [
        { latitude: 35.6815, longitude: 139.7675 },
        { latitude: 35.6816, longitude: 139.7675 },
        { latitude: 35.6816, longitude: 139.7676 },
        { latitude: 35.6815, longitude: 139.7676 },
      ],
      height: 50,
    },
  ];

  it('昼間は全建物の影が生成される', () => {
    const noon = new Date('2024-06-21T12:00:00+09:00');
    const sunPosition = getSunPosition(noon, 35.6812, 139.7671);
    const shadows = calculateAllShadows(buildings, sunPosition, 35.6812);
    
    expect(shadows.length).toBe(2);
  });

  it('夜間は影が生成されない', () => {
    const midnight = new Date('2024-06-21T00:00:00+09:00');
    const sunPosition = getSunPosition(midnight, 35.6812, 139.7671);
    const shadows = calculateAllShadows(buildings, sunPosition, 35.6812);
    
    expect(shadows.length).toBe(0);
  });
});

describe('日陰率の計算', () => {
  it('影がない場合は0%', () => {
    const percentage = calculateShadePercentage(
      { minLat: 35.68, minLng: 139.76, maxLat: 35.69, maxLng: 139.77 },
      []
    );
    
    expect(percentage).toBe(0);
  });

  it('日陰率は0-100の範囲', () => {
    const sampleShadow = {
      buildingId: 'test',
      coordinates: [
        { latitude: 35.68, longitude: 139.76 },
        { latitude: 35.69, longitude: 139.76 },
        { latitude: 35.69, longitude: 139.77 },
        { latitude: 35.68, longitude: 139.77 },
      ],
      opacity: 0.5,
    };
    
    const percentage = calculateShadePercentage(
      { minLat: 35.68, minLng: 139.76, maxLat: 35.69, maxLng: 139.77 },
      [sampleShadow]
    );
    
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});

describe('UV削減率の計算', () => {
  it('日陰0%ではUV削減なし', () => {
    expect(calculateUVReduction(0)).toBe(0);
  });

  it('日陰100%では最大削減', () => {
    const reduction = calculateUVReduction(100);
    expect(reduction).toBeGreaterThan(0);
    expect(reduction).toBeLessThanOrEqual(1);
  });

  it('日陰率が高いほどUV削減率も高い', () => {
    const reduction25 = calculateUVReduction(25);
    const reduction50 = calculateUVReduction(50);
    const reduction75 = calculateUVReduction(75);
    
    expect(reduction25).toBeLessThan(reduction50);
    expect(reduction50).toBeLessThan(reduction75);
  });
});

describe('日の出・日の入り時刻の取得', () => {
  it('夏至の日の出は日の入りより早い', () => {
    const summerSolstice = new Date('2024-06-21');
    const times = getSunTimes(summerSolstice, 35.6812, 139.7671);
    
    expect(times.sunrise.getTime()).toBeLessThan(times.sunset.getTime());
  });

  it('正午は日の出と日の入りの間', () => {
    const date = new Date('2024-06-21');
    const times = getSunTimes(date, 35.6812, 139.7671);
    
    expect(times.solarNoon.getTime()).toBeGreaterThan(times.sunrise.getTime());
    expect(times.solarNoon.getTime()).toBeLessThan(times.sunset.getTime());
  });
});
