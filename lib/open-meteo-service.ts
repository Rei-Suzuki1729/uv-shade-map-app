/**
 * Open-Meteo API統合サービス
 * 
 * Open-Meteoは無料でAPIキー不要の気象データAPIです。
 * UV指数データを含む高精度な気象情報を提供します。
 * 
 * API Documentation: https://open-meteo.com/en/docs
 */

export interface OpenMeteoUVData {
  uvIndex: number;
  uvIndexMax: number;
  uvIndexClearSkyMax: number;
  timestamp: string;
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: {
    time: string[];
    uv_index_max: number[];
    uv_index_clear_sky_max: number[];
  };
  current_weather?: {
    temperature: number;
    time: string;
  };
}

/**
 * Open-Meteo APIからUV指数データを取得
 * 
 * @param latitude 緯度
 * @param longitude 経度
 * @returns UV指数データ
 */
export async function fetchUVDataFromOpenMeteo(
  latitude: number,
  longitude: number
): Promise<OpenMeteoUVData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  
  url.searchParams.append('latitude', latitude.toFixed(4));
  url.searchParams.append('longitude', longitude.toFixed(4));
  url.searchParams.append('daily', 'uv_index_max,uv_index_clear_sky_max');
  url.searchParams.append('timezone', 'auto');
  url.searchParams.append('forecast_days', '1');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.daily || !data.daily.uv_index_max || data.daily.uv_index_max.length === 0) {
      throw new Error('No UV data available from Open-Meteo');
    }

    const uvIndexMax = data.daily.uv_index_max[0];
    const uvIndexClearSkyMax = data.daily.uv_index_clear_sky_max[0];
    
    // 現在時刻に基づいて推定UV指数を計算
    // 日中のピーク時（正午前後）に最大値、朝夕は低くなる
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInHours = hour + minute / 60;
    
    // 太陽高度に基づく係数（6時〜18時の間でベルカーブ）
    let timeFactor = 0;
    if (timeInHours >= 6 && timeInHours <= 18) {
      // 正午（12時）を中心としたベルカーブ
      const hoursFromNoon = Math.abs(timeInHours - 12);
      timeFactor = Math.max(0, 1 - (hoursFromNoon / 6) ** 2);
    }
    
    const currentUvIndex = uvIndexMax * timeFactor;

    return {
      uvIndex: Math.max(0, Math.round(currentUvIndex * 10) / 10),
      uvIndexMax: Math.round(uvIndexMax * 10) / 10,
      uvIndexClearSkyMax: Math.round(uvIndexClearSkyMax * 10) / 10,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch UV data from Open-Meteo:', error);
    throw error;
  }
}

/**
 * 複数日のUV予報データを取得
 * 
 * @param latitude 緯度
 * @param longitude 経度
 * @param days 予報日数（1-16日）
 * @returns 日別UV指数予報
 */
export async function fetchUVForecast(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<Array<{ date: string; uvIndexMax: number; uvIndexClearSkyMax: number }>> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  
  url.searchParams.append('latitude', latitude.toFixed(4));
  url.searchParams.append('longitude', longitude.toFixed(4));
  url.searchParams.append('daily', 'uv_index_max,uv_index_clear_sky_max');
  url.searchParams.append('timezone', 'auto');
  url.searchParams.append('forecast_days', Math.min(16, Math.max(1, days)).toString());

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      throw new Error('No forecast data available from Open-Meteo');
    }

    return data.daily.time.map((date, index) => ({
      date,
      uvIndexMax: Math.round(data.daily.uv_index_max[index] * 10) / 10,
      uvIndexClearSkyMax: Math.round(data.daily.uv_index_clear_sky_max[index] * 10) / 10,
    }));
  } catch (error) {
    console.error('Failed to fetch UV forecast from Open-Meteo:', error);
    throw error;
  }
}

/**
 * 時間別UV指数データを取得（より詳細な予測）
 * 
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 時間別UV指数データ
 */
export async function fetchHourlyUVData(
  latitude: number,
  longitude: number
): Promise<Array<{ time: string; uvIndex: number }>> {
  // Open-Meteoは時間別UV指数を直接提供していないため、
  // 日別最大値と太陽高度から推定する
  const dailyData = await fetchUVForecast(latitude, longitude, 1);
  
  if (dailyData.length === 0) {
    return [];
  }

  const uvMax = dailyData[0].uvIndexMax;
  const hourlyData: Array<{ time: string; uvIndex: number }> = [];
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 0時から23時まで1時間ごとのデータを生成
  for (let hour = 0; hour < 24; hour++) {
    const time = new Date(today.getTime() + hour * 60 * 60 * 1000);
    
    // 太陽高度に基づく係数（6時〜18時の間でベルカーブ）
    let timeFactor = 0;
    if (hour >= 6 && hour <= 18) {
      const hoursFromNoon = Math.abs(hour - 12);
      timeFactor = Math.max(0, 1 - (hoursFromNoon / 6) ** 2);
    }
    
    const uvIndex = uvMax * timeFactor;
    
    hourlyData.push({
      time: time.toISOString(),
      uvIndex: Math.max(0, Math.round(uvIndex * 10) / 10),
    });
  }
  
  return hourlyData;
}
