/**
 * 高精度日陰計算ロジック
 * PLATEAUの建物データを使用して正確な影を計算
 */

import SunCalc from 'suncalc';
import { Building } from './shade-calculator';

export interface ShadowPolygon {
  buildingId: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  opacity: number; // 影の濃さ（0-1）
}

export interface SunPosition {
  altitude: number;      // 太陽高度（ラジアン）
  azimuth: number;       // 太陽方位角（ラジアン、北=0）
  altitudeDegrees: number;
  azimuthDegrees: number;
}

export interface ShadeAnalysis {
  sunPosition: SunPosition;
  shadows: ShadowPolygon[];
  shadePercentage: number;  // 日陰の割合（0-100）
  uvReduction: number;      // UV削減率（0-1）
}

/**
 * 太陽の位置を取得
 */
export function getSunPosition(
  date: Date,
  latitude: number,
  longitude: number
): SunPosition {
  const position = SunCalc.getPosition(date, latitude, longitude);
  
  // SunCalcのazimuthは南=0、時計回り
  // 北=0に変換
  const azimuthFromNorth = (position.azimuth + Math.PI) % (2 * Math.PI);
  
  return {
    altitude: position.altitude,
    azimuth: azimuthFromNorth,
    altitudeDegrees: (position.altitude * 180) / Math.PI,
    azimuthDegrees: (azimuthFromNorth * 180) / Math.PI,
  };
}

/**
 * 太陽が地平線上にあるかチェック
 */
export function isSunAboveHorizon(sunPosition: SunPosition): boolean {
  return sunPosition.altitude > 0;
}

/**
 * 建物の影のポリゴンを計算（高精度版）
 */
export function calculateBuildingShadow(
  building: Building,
  sunPosition: SunPosition,
  latitude: number
): ShadowPolygon | null {
  if (!isSunAboveHorizon(sunPosition)) {
    return null;
  }
  
  // 影の長さを計算
  const shadowLength = building.height / Math.tan(sunPosition.altitude);
  
  if (shadowLength <= 0 || shadowLength > 500) {
    // 影が長すぎる場合は制限
    return null;
  }
  
  // 影の方向（太陽の反対方向）
  const shadowDirection = sunPosition.azimuth + Math.PI;
  
  // 緯度に基づく座標変換係数
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((latitude * Math.PI) / 180);
  
  // 影の先端座標を計算
  const shadowCoordinates: Array<{ latitude: number; longitude: number }> = [];
  
  // 建物の各頂点から影を投影
  for (const coord of building.coordinates) {
    const latOffset = (shadowLength * Math.cos(shadowDirection)) / metersPerDegreeLat;
    const lngOffset = (shadowLength * Math.sin(shadowDirection)) / metersPerDegreeLng;
    
    shadowCoordinates.push({
      latitude: coord.latitude + latOffset,
      longitude: coord.longitude + lngOffset,
    });
  }
  
  // 建物の底面と影の先端を結合してポリゴンを作成
  const polygon: Array<{ latitude: number; longitude: number }> = [
    ...building.coordinates,
    ...shadowCoordinates.reverse(),
  ];
  
  // 影の濃さを計算（太陽高度に基づく）
  // 太陽が低いほど影は薄い（大気による散乱）
  const opacity = Math.min(0.8, 0.3 + (sunPosition.altitudeDegrees / 90) * 0.5);
  
  return {
    buildingId: building.id,
    coordinates: polygon,
    opacity,
  };
}

/**
 * 複数の建物の影を一括計算
 */
export function calculateAllShadows(
  buildings: Building[],
  sunPosition: SunPosition,
  centerLatitude: number
): ShadowPolygon[] {
  if (!isSunAboveHorizon(sunPosition)) {
    return [];
  }
  
  const shadows: ShadowPolygon[] = [];
  
  for (const building of buildings) {
    const shadow = calculateBuildingShadow(building, sunPosition, centerLatitude);
    if (shadow) {
      shadows.push(shadow);
    }
  }
  
  return shadows;
}

/**
 * 指定地点が日陰かどうかを判定
 */
export function isPointInShade(
  point: { latitude: number; longitude: number },
  shadows: ShadowPolygon[]
): boolean {
  for (const shadow of shadows) {
    if (isPointInPolygon(point, shadow.coordinates)) {
      return true;
    }
  }
  return false;
}

/**
 * 点がポリゴン内にあるかを判定（レイキャスティング法）
 */
function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
): boolean {
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
 * 指定範囲内の日陰率を計算
 */
export function calculateShadePercentage(
  bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  },
  shadows: ShadowPolygon[],
  gridResolution: number = 20
): number {
  const latStep = (bounds.maxLat - bounds.minLat) / gridResolution;
  const lngStep = (bounds.maxLng - bounds.minLng) / gridResolution;
  
  let shadedPoints = 0;
  let totalPoints = 0;
  
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      totalPoints++;
      if (isPointInShade({ latitude: lat, longitude: lng }, shadows)) {
        shadedPoints++;
      }
    }
  }
  
  return totalPoints > 0 ? (shadedPoints / totalPoints) * 100 : 0;
}

/**
 * 日陰によるUV削減率を計算
 * 研究に基づく推定値
 * 参考: WHO Global Solar UV Index
 */
export function calculateUVReduction(shadePercentage: number): number {
  // 完全な日陰でも散乱光により約50-75%のUVが残る
  // 部分的な日陰では線形に補間
  const maxReduction = 0.75; // 最大75%削減
  return (shadePercentage / 100) * maxReduction;
}

/**
 * 時間帯別の日陰分析
 */
export function analyzeShadeOverTime(
  buildings: Building[],
  centerLat: number,
  centerLng: number,
  date: Date,
  intervalMinutes: number = 30
): Array<{ time: Date; analysis: ShadeAnalysis }> {
  const results: Array<{ time: Date; analysis: ShadeAnalysis }> = [];
  
  // 日の出・日の入りを取得
  const times = SunCalc.getTimes(date, centerLat, centerLng);
  const sunrise = times.sunrise;
  const sunset = times.sunset;
  
  // 日の出から日の入りまで分析
  const current = new Date(sunrise);
  while (current <= sunset) {
    const sunPosition = getSunPosition(current, centerLat, centerLng);
    const shadows = calculateAllShadows(buildings, sunPosition, centerLat);
    
    // 分析範囲（中心から500m四方）
    const bounds = {
      minLat: centerLat - 0.0045,
      minLng: centerLng - 0.0055,
      maxLat: centerLat + 0.0045,
      maxLng: centerLng + 0.0055,
    };
    
    const shadePercentage = calculateShadePercentage(bounds, shadows);
    const uvReduction = calculateUVReduction(shadePercentage);
    
    results.push({
      time: new Date(current),
      analysis: {
        sunPosition,
        shadows,
        shadePercentage,
        uvReduction,
      },
    });
    
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  
  return results;
}

/**
 * 日の出・日の入り時刻を取得
 */
export function getSunTimes(
  date: Date,
  latitude: number,
  longitude: number
): {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  goldenHour: Date;
  goldenHourEnd: Date;
} {
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,
    goldenHour: times.goldenHour,
    goldenHourEnd: times.goldenHourEnd,
  };
}
