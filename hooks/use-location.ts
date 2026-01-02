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
        // ブラウザのGeolocation APIを使用
        if (navigator.geolocation) {
          return new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: position.timestamp,
                });
                setLoading(false);
                resolve();
              },
              (err) => {
                console.warn('Geolocation error:', err.message);
                // エラー時はデフォルト位置を使用
                setLocation(DEFAULT_LOCATION);
                setError('位置情報を取得できませんでした。デフォルト位置を使用しています。');
                setLoading(false);
                resolve();
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
              }
            );
          });
        } else {
          setLocation(DEFAULT_LOCATION);
          setError('このブラウザは位置情報をサポートしていません。');
          setLoading(false);
          return;
        }
      }

      // ネイティブ環境
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLocation(DEFAULT_LOCATION);
          setError('位置情報の許可が必要です。デフォルト位置を使用しています。');
          setLoading(false);
          return;
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: currentLocation.timestamp,
      });
    } catch (e) {
      console.error('Location error:', e);
      setLocation(DEFAULT_LOCATION);
      setError('位置情報の取得に失敗しました。デフォルト位置を使用しています。');
    } finally {
      setLoading(false);
    }
  }, [requestPermission]);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    error,
    loading,
    refresh: getCurrentLocation,
    requestPermission,
  };
}
