/**
 * UV指数データ取得サービス
 * OpenUV APIを使用してリアルタイムのUV指数を取得
 * APIキーがない場合はモックデータを返す
 */

import { getSunPosition, isSunUp } from './shade-calculator';

export interface UVData {
  uv: number;
  uvMax: number;
  uvMaxTime: string;
  ozone: number;
  safeExposureTime: {
    st1: number;
    st2: number;
    st3: number;
    st4: number;
    st5: number;
    st6: number;
  };
  sunInfo: {
    sunrise: string;
    sunset: string;
    sunPosition: {
      altitude: number;
      azimuth: number;
    };
  };
}

/**
 * UV指数を計算するシミュレーション関数
 * 太陽の高度に基づいてUV指数を推定
 * 実際のAPIが利用できない場合のフォールバック
 */
function calculateSimulatedUV(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): number {
  const sunPosition = getSunPosition(date, latitude, longitude);
  
  if (!isSunUp(sunPosition)) {
    return 0;
  }
  
  // 太陽高度に基づくUV指数の推定
  // 高度が高いほどUV指数が高い
  const altitudeDegrees = sunPosition.altitudeDegrees;
  
  // 基本UV指数（高度90度で最大11）
  let baseUV = (altitudeDegrees / 90) * 11;
  
  // 季節による補正（北半球の場合、夏は高く、冬は低い）
  const month = date.getMonth();
  const seasonFactor = latitude > 0
    ? 1 + 0.3 * Math.sin((month - 3) * Math.PI / 6) // 北半球
    : 1 + 0.3 * Math.sin((month - 9) * Math.PI / 6); // 南半球
  
  baseUV *= seasonFactor;
  
  // 緯度による補正（赤道に近いほど高い）
  const latitudeFactor = 1 - Math.abs(latitude) / 180;
  baseUV *= (0.7 + 0.3 * latitudeFactor);
  
  // 雲量による補正（ランダム要素、実際は天気APIから取得）
  const cloudFactor = 0.8 + Math.random() * 0.2;
  baseUV *= cloudFactor;
  
  return Math.max(0, Math.min(15, Math.round(baseUV * 10) / 10));
}

/**
 * 安全な露出時間を計算
 * フィッツパトリック肌タイプに基づく
 */
function calculateSafeExposureTime(uvIndex: number): UVData['safeExposureTime'] {
  if (uvIndex === 0) {
    return { st1: 999, st2: 999, st3: 999, st4: 999, st5: 999, st6: 999 };
  }
  
  // 各肌タイプのMED (Minimal Erythema Dose) に基づく計算
  const medValues = [200, 250, 300, 450, 600, 900];
  const uvIntensity = uvIndex * 0.0025; // mJ/cm²/s
  
  const times: number[] = medValues.map(med => {
    const seconds = med / uvIntensity;
    return Math.min(999, Math.floor(seconds / 60));
  });
  
  return {
    st1: times[0],
    st2: times[1],
    st3: times[2],
    st4: times[3],
    st5: times[4],
    st6: times[5],
  };
}

/**
 * UV指数データを取得
 * @param latitude 緯度
 * @param longitude 経度
 * @param apiKey OpenUV APIキー（オプション）
 */
export async function getUVData(
  latitude: number,
  longitude: number,
  apiKey?: string
): Promise<UVData> {
  const now = new Date();
  
  // APIキーがある場合は実際のAPIを呼び出す
  if (apiKey) {
    try {
      const response = await fetch(
        `https://api.openuv.io/api/v1/uv?lat=${latitude}&lng=${longitude}`,
        {
          headers: {
            'x-access-token': apiKey,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const sunPosition = getSunPosition(now, latitude, longitude);
        
        return {
          uv: data.result.uv,
          uvMax: data.result.uv_max,
          uvMaxTime: data.result.uv_max_time,
          ozone: data.result.ozone,
          safeExposureTime: data.result.safe_exposure_time || calculateSafeExposureTime(data.result.uv),
          sunInfo: {
            sunrise: data.result.sun_info?.sun_times?.sunrise || '',
            sunset: data.result.sun_info?.sun_times?.sunset || '',
            sunPosition: {
              altitude: sunPosition.altitudeDegrees,
              azimuth: sunPosition.azimuthDegrees,
            },
          },
        };
      }
    } catch (error) {
      console.warn('OpenUV API error, falling back to simulation:', error);
    }
  }
  
  // シミュレーションデータを返す
  const simulatedUV = calculateSimulatedUV(latitude, longitude, now);
  const sunPosition = getSunPosition(now, latitude, longitude);
  
  // 日の出・日の入り時刻を計算
  const SunCalc = require('suncalc');
  const times = SunCalc.getTimes(now, latitude, longitude);
  
  return {
    uv: simulatedUV,
    uvMax: simulatedUV * 1.2, // 最大値は現在値の1.2倍と仮定
    uvMaxTime: new Date(now.setHours(12, 0, 0, 0)).toISOString(),
    ozone: 280 + Math.random() * 40, // 典型的なオゾン値
    safeExposureTime: calculateSafeExposureTime(simulatedUV),
    sunInfo: {
      sunrise: times.sunrise.toISOString(),
      sunset: times.sunset.toISOString(),
      sunPosition: {
        altitude: sunPosition.altitudeDegrees,
        azimuth: sunPosition.azimuthDegrees,
      },
    },
  };
}

/**
 * ヒートマップ用のUVグリッドデータを生成
 * @param centerLat 中心緯度
 * @param centerLng 中心経度
 * @param gridSize グリッドサイズ
 * @param cellSize セルサイズ（度）
 */
export function generateUVHeatmapData(
  centerLat: number,
  centerLng: number,
  gridSize: number = 10,
  cellSize: number = 0.001
): Array<{ latitude: number; longitude: number; intensity: number }> {
  const data: Array<{ latitude: number; longitude: number; intensity: number }> = [];
  const now = new Date();
  
  const halfGrid = gridSize / 2;
  
  for (let i = -halfGrid; i < halfGrid; i++) {
    for (let j = -halfGrid; j < halfGrid; j++) {
      const lat = centerLat + i * cellSize;
      const lng = centerLng + j * cellSize;
      
      // 基本UV値を計算
      const baseUV = calculateSimulatedUV(lat, lng, now);
      
      // 日陰の影響をシミュレート（ランダムな減衰）
      const shadeFactor = Math.random() > 0.7 ? 0.3 + Math.random() * 0.3 : 1;
      
      data.push({
        latitude: lat,
        longitude: lng,
        intensity: baseUV * shadeFactor / 11, // 0-1に正規化
      });
    }
  }
  
  return data;
}
