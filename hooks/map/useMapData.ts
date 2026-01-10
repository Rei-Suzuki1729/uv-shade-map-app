import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type UVData, getUVData } from '@/lib/uv-service';
import { type Building } from '@/lib/shade-calculator';
import {
  type ShadowPolygon,
  type SunPosition,
  getSunPosition,
  calculateAllShadows,
  isSunAboveHorizon,
} from '@/lib/advanced-shade-calculator';
import { fetchBuildingsNearby } from '@/lib/plateau-service';
import { getApiBaseUrl } from '@/constants/oauth';

// キャッシュキー
const CACHE_KEYS = {
  UV_DATA: 'uv_data_cache',
  BUILDINGS: 'buildings_cache',
};

// キャッシュ有効期限（5分）
const CACHE_TTL = 5 * 60 * 1000;

// キャッシュユーティリティ
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data as T;
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  return null;
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

export function useMapData(
  location: { latitude: number; longitude: number } | null,
  currentTime?: Date
) {
  const [uvData, setUVData] = useState<UVData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [shadows, setShadows] = useState<ShadowPolygon[]>([]);
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // データ取得（UV、建物）
  const loadData = useCallback(async () => {
    if (!location) return;

    setIsLoading(true);
    setError(null);

    try {
      // キャッシュからUVデータを取得
      let uv: UVData | null = null;
      const cachedData = await getCachedData<any>(CACHE_KEYS.UV_DATA);

      // キャッシュデータがあれば、それが正しいUVData形式か確認
      if (cachedData && cachedData.uv !== undefined) {
        uv = cachedData;
      }

      if (!uv) {
        // バックエンドAPIから取得を試みる
        try {
          // tRPCのバッチクエリ形式でリクエスト (superjson対応)
          const inputData = {
            "0": {
              json: {
                latitude: location.latitude,
                longitude: location.longitude,
              }
            }
          };
          const apiUrl = `${getApiBaseUrl()}/api/trpc/uv.getData?batch=1&input=${encodeURIComponent(JSON.stringify(inputData))}`;
          const response = await fetch(apiUrl, {
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            // バッチレスポンスの形式: [{result: {data: {json: {source, data}}}}]
            if (result[0]?.result?.data?.json) {
              const apiData = result[0].result.data.json;
              // APIレスポンスをUVData型に変換
              const baseUvData = await getUVData(location.latitude, location.longitude);
              // APIからの実際の値で上書き
              uv = {
                ...baseUvData,
                uv: apiData.data.uvIndex,
                uvMax: apiData.data.uvMax || apiData.data.uvIndex,
                uvMaxTime: apiData.data.uvMaxTime || '12:00',
              };
            } else {
              throw new Error('Invalid API response format');
            }
          } else {
            const errorData = await response.json();
            console.error('API error:', errorData);
            throw new Error('API request failed');
          }
        } catch (apiError) {
          console.warn('Failed to fetch from API, using simulation:', apiError);
          // フォールバック: シミュレーションデータを使用
          uv = await getUVData(location.latitude, location.longitude);
        }
        await setCachedData(CACHE_KEYS.UV_DATA, uv);
      }
      setUVData(uv);

      // キャッシュから建物データを取得
      let buildingData = await getCachedData<Building[]>(CACHE_KEYS.BUILDINGS);
      if (!buildingData) {
        buildingData = await fetchBuildingsNearby(
          location.latitude,
          location.longitude,
          0.3
        );
        await setCachedData(CACHE_KEYS.BUILDINGS, buildingData);
      }
      setBuildings(buildingData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  // 太陽位置と影の計算（時刻、場所、建物データに依存）
  useEffect(() => {
    if (!location) return;

    const time = currentTime || new Date();
    const newSunPosition = getSunPosition(time, location.latitude, location.longitude);
    setSunPosition(newSunPosition);

    if (buildings.length > 0 && isSunAboveHorizon(newSunPosition)) {
      const newShadows = calculateAllShadows(buildings, newSunPosition, location.latitude);
      setShadows(newShadows);
    } else {
      setShadows([]);
    }
  }, [location, buildings, currentTime]);

  // locationが変更されたらデータを再取得
  useEffect(() => {
    if (location) {
      loadData();
    }
  }, [location, loadData]);

  return {
    uvData,
    buildings,
    shadows,
    sunPosition,
    isLoading,
    error,
    refresh: loadData,
  };
}
