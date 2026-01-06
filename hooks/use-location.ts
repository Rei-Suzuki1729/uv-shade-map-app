/**
 * 位置情報を取得・管理するカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface UseLocationResult {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

// デフォルト位置（東京駅）
const DEFAULT_LOCATION: LocationData = {
  latitude: 35.6812,
  longitude: 139.7671,
  accuracy: null,
  timestamp: Date.now(),
};

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.error('Permission request error:', e);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Web環境の場合は特別な処理
      if (Platform.OS === 'web') {
        // まずデフォルト位置を設定して表示を開始
        setLocation(DEFAULT_LOCATION);
        setLoading(false);

        // バックグラウンドで位置情報を取得しようとする
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
              });
            },
            (err) => {
              console.warn('Geolocation error:', err.message);
              // エラー時はデフォルト位置のまま
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 60000,
            }
          );
        }
        return;
      }

      // ネイティブ環境：まずデフォルト位置を設定
      setLocation(DEFAULT_LOCATION);
      setLoading(false);

      // 許可状態を確認
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // 許可済みの場合はすぐに位置情報を取得
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: currentLocation.timestamp,
        });
      } else if (status === 'undetermined') {
        // 未設定の場合は許可をリクエスト
        const granted = await requestPermission();
        if (granted) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy,
            timestamp: currentLocation.timestamp,
          });
        }
        // 許可されなかった場合はデフォルト位置のまま
      }
      // deniedの場合はデフォルト位置のまま
    } catch (e) {
      console.error('Location error:', e);
      // エラー時もデフォルト位置を使用
      setLocation(DEFAULT_LOCATION);
      setError(null);
      setLoading(false);
    }
  }, [requestPermission]);

  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  return {
    location,
    error,
    loading,
    refresh: getCurrentLocation,
    requestPermission,
  };
}
