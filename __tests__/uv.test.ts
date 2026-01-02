/**
 * UV指数関連のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  getUVLevel,
  getSafeExposureTime,
  getUVColor,
  getUVRecommendation,
  SKIN_TYPES,
  UV_LEVELS,
} from '../constants/uv';

describe('UV指数レベル判定', () => {
  it('UV指数0-2は「低」レベルを返す', () => {
    expect(getUVLevel(0).level).toBe('low');
    expect(getUVLevel(1).level).toBe('low');
    expect(getUVLevel(2).level).toBe('low');
    expect(getUVLevel(2.9).level).toBe('low');
  });

  it('UV指数3-5は「中程度」レベルを返す', () => {
    expect(getUVLevel(3).level).toBe('moderate');
    expect(getUVLevel(4).level).toBe('moderate');
    expect(getUVLevel(5).level).toBe('moderate');
    expect(getUVLevel(5.9).level).toBe('moderate');
  });

  it('UV指数6-7は「高」レベルを返す', () => {
    expect(getUVLevel(6).level).toBe('high');
    expect(getUVLevel(7).level).toBe('high');
    expect(getUVLevel(7.9).level).toBe('high');
  });

  it('UV指数8-10は「非常に高」レベルを返す', () => {
    expect(getUVLevel(8).level).toBe('veryHigh');
    expect(getUVLevel(9).level).toBe('veryHigh');
    expect(getUVLevel(10).level).toBe('veryHigh');
    expect(getUVLevel(10.9).level).toBe('veryHigh');
  });

  it('UV指数11以上は「極端」レベルを返す', () => {
    expect(getUVLevel(11).level).toBe('extreme');
    expect(getUVLevel(12).level).toBe('extreme');
    expect(getUVLevel(15).level).toBe('extreme');
  });
});

describe('安全な屋外活動時間の計算', () => {
  it('UV指数0の場合は999分（制限なし）を返す', () => {
    expect(getSafeExposureTime(0, 3)).toBe(999);
  });

  it('肌タイプが高いほど安全時間が長くなる', () => {
    const uvIndex = 5;
    const time1 = getSafeExposureTime(uvIndex, 1);
    const time3 = getSafeExposureTime(uvIndex, 3);
    const time6 = getSafeExposureTime(uvIndex, 6);
    
    expect(time1).toBeLessThan(time3);
    expect(time3).toBeLessThan(time6);
  });

  it('UV指数が高いほど安全時間が短くなる', () => {
    const skinType = 3;
    const time2 = getSafeExposureTime(2, skinType);
    const time5 = getSafeExposureTime(5, skinType);
    const time10 = getSafeExposureTime(10, skinType);
    
    expect(time2).toBeGreaterThan(time5);
    expect(time5).toBeGreaterThan(time10);
  });

  it('安全時間は正の数を返す', () => {
    for (let uv = 1; uv <= 12; uv++) {
      for (let skin = 1; skin <= 6; skin++) {
        const time = getSafeExposureTime(uv, skin);
        expect(time).toBeGreaterThan(0);
      }
    }
  });
});

describe('UV色の取得', () => {
  it('低レベルは緑色を返す', () => {
    expect(getUVColor(1)).toBe('#22C55E');
  });

  it('中程度レベルは黄色を返す', () => {
    expect(getUVColor(4)).toBe('#EAB308');
  });

  it('高レベルはオレンジ色を返す', () => {
    expect(getUVColor(7)).toBe('#F97316');
  });

  it('非常に高レベルは赤色を返す', () => {
    expect(getUVColor(9)).toBe('#EF4444');
  });

  it('極端レベルは紫色を返す', () => {
    expect(getUVColor(12)).toBe('#A855F7');
  });
});

describe('UV推奨事項の取得', () => {
  it('各レベルで推奨事項が返される', () => {
    expect(getUVRecommendation(1)).toBeTruthy();
    expect(getUVRecommendation(4)).toBeTruthy();
    expect(getUVRecommendation(7)).toBeTruthy();
    expect(getUVRecommendation(9)).toBeTruthy();
    expect(getUVRecommendation(12)).toBeTruthy();
  });

  it('高UV時は日陰に関する推奨が含まれる', () => {
    const recommendation = getUVRecommendation(8);
    expect(recommendation).toContain('日陰');
  });
});

describe('肌タイプ定義', () => {
  it('6つの肌タイプが定義されている', () => {
    expect(SKIN_TYPES).toHaveLength(6);
  });

  it('各肌タイプにid、name、descriptionがある', () => {
    SKIN_TYPES.forEach((type) => {
      expect(type.id).toBeGreaterThanOrEqual(1);
      expect(type.id).toBeLessThanOrEqual(6);
      expect(type.name).toBeTruthy();
      expect(type.description).toBeTruthy();
    });
  });
});

describe('UVレベル定義', () => {
  it('5つのレベルが定義されている', () => {
    expect(Object.keys(UV_LEVELS)).toHaveLength(5);
  });

  it('各レベルに必要なプロパティがある', () => {
    Object.values(UV_LEVELS).forEach((level) => {
      expect(level.level).toBeTruthy();
      expect(level.label).toBeTruthy();
      expect(level.labelJa).toBeTruthy();
      expect(level.description).toBeTruthy();
      expect(level.recommendation).toBeTruthy();
      expect(level.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(level.colorDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
