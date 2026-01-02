/**
 * 日陰計算ユーティリティ
 * SunCalcライブラリを使用して太陽の位置を計算し、
 * 建物の影を算出する
 */

import SunCalc from 'suncalc';

export interface SunPosition {
  altitude: number;  // 太陽の高度（ラジアン）
  azimuth: number;   // 太陽の方位角（ラジアン、北=0、東=π/2）
  altitudeDegrees: number;
  azimuthDegrees: number;
}

export interface Building {
  id: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  height: number; // メートル
}

export interface ShadowPolygon {
  buildingId: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

/**
 * 指定した日時と位置での太陽の位置を取得
 */
export function getSunPosition(
  date: Date,
  latitude: number,
  longitude: number
): SunPosition {
  const position = SunCalc.getPosition(date, latitude, longitude);
  
  return {
    altitude: position.altitude,
    azimuth: position.azimuth,
    altitudeDegrees: (position.altitude * 180) / Math.PI,
    azimuthDegrees: ((position.azimuth * 180) / Math.PI + 180) % 360, // 北を0度に変換
  };
}

/**
 * 太陽が地平線上にあるかどうかを判定
 */
export function isSunUp(sunPosition: SunPosition): boolean {
  return sunPosition.altitude > 0;
}

/**
 * 建物の影の長さを計算
 * @param buildingHeight 建物の高さ（メートル）
 * @param sunAltitude 太陽の高度（ラジアン）
 * @returns 影の長さ（メートル）
 */
export function calculateShadowLength(
  buildingHeight: number,
  sunAltitude: number
): number {
  if (sunAltitude <= 0) {
    return 0; // 太陽が沈んでいる場合は影なし
  }
  
  // 影の長さ = 建物の高さ / tan(太陽の高度)
  return buildingHeight / Math.tan(sunAltitude);
}

/**
 * 緯度経度の差をメートルに変換（簡易計算）
 */
function metersToLatLng(
  meters: number,
  latitude: number
): { latDiff: number; lngDiff: number } {
  // 1度あたりの距離（メートル）
  const latMetersPerDegree = 111320;
  const lngMetersPerDegree = 111320 * Math.cos((latitude * Math.PI) / 180);
  
  return {
    latDiff: meters / latMetersPerDegree,
    lngDiff: meters / lngMetersPerDegree,
  };
}

/**
 * 建物の影のポリゴンを計算
 * @param building 建物情報
 * @param sunPosition 太陽の位置
 * @returns 影のポリゴン座標
 */
export function calculateBuildingShadow(
  building: Building,
  sunPosition: SunPosition
): ShadowPolygon | null {
  if (!isSunUp(sunPosition)) {
    return null;
  }

  const shadowLength = calculateShadowLength(building.height, sunPosition.altitude);
  
  if (shadowLength <= 0) {
    return null;
  }

  // 影の方向（太陽の反対方向）
  const shadowDirection = sunPosition.azimuth + Math.PI;
  
  // 影の座標を計算
  const shadowCoordinates: Array<{ latitude: number; longitude: number }> = [];
  
  // 建物の各頂点から影の先端を計算
  for (const coord of building.coordinates) {
    const { latDiff, lngDiff } = metersToLatLng(shadowLength, coord.latitude);
    
    const shadowLat = coord.latitude + latDiff * Math.cos(shadowDirection);
    const shadowLng = coord.longitude + lngDiff * Math.sin(shadowDirection);
    
    shadowCoordinates.push({ latitude: shadowLat, longitude: shadowLng });
  }
  
  // 建物の座標と影の先端を結合してポリゴンを作成
  const polygon: Array<{ latitude: number; longitude: number }> = [
    ...building.coordinates,
    ...shadowCoordinates.reverse(),
  ];
  
  return {
    buildingId: building.id,
    coordinates: polygon,
  };
}

/**
 * 日の出・日の入り時刻を取得
 */
export function getSunTimes(
  date: Date,
  latitude: number,
  longitude: number
): { sunrise: Date; sunset: Date; solarNoon: Date } {
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,
  };
}

/**
 * 指定した時間帯の太陽位置の配列を生成
 * @param date 基準日
 * @param latitude 緯度
 * @param longitude 経度
 * @param intervalMinutes 間隔（分）
 * @returns 太陽位置の配列
 */
export function getSunPositionsForDay(
  date: Date,
  latitude: number,
  longitude: number,
  intervalMinutes: number = 30
): Array<{ time: Date; position: SunPosition }> {
  const positions: Array<{ time: Date; position: SunPosition }> = [];
  const { sunrise, sunset } = getSunTimes(date, latitude, longitude);
  
  const current = new Date(sunrise);
  while (current <= sunset) {
    positions.push({
      time: new Date(current),
      position: getSunPosition(current, latitude, longitude),
    });
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  
  return positions;
}

/**
 * サンプルの建物データを生成（デモ用）
 * 実際のアプリではOverpass APIから取得
 */
export function generateSampleBuildings(
  centerLat: number,
  centerLng: number,
  count: number = 10
): Building[] {
  const buildings: Building[] = [];
  
  for (let i = 0; i < count; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.005;
    const offsetLng = (Math.random() - 0.5) * 0.005;
    const baseLat = centerLat + offsetLat;
    const baseLng = centerLng + offsetLng;
    
    // ランダムな建物サイズ
    const width = 0.0002 + Math.random() * 0.0003;
    const height = 0.0002 + Math.random() * 0.0003;
    const buildingHeight = 10 + Math.random() * 50; // 10-60m
    
    buildings.push({
      id: `building-${i}`,
      coordinates: [
        { latitude: baseLat, longitude: baseLng },
        { latitude: baseLat + height, longitude: baseLng },
        { latitude: baseLat + height, longitude: baseLng + width },
        { latitude: baseLat, longitude: baseLng + width },
      ],
      height: buildingHeight,
    });
  }
  
  return buildings;
}
