import { useState, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { type MapMode } from '@/components/map-mode-selector';
import { reverseGeocode } from '@/lib/geocoding-service';

export function useMapControls(
  location: { latitude: number; longitude: number } | null,
  refreshLocation: () => void
) {
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [isTracking, setIsTracking] = useState(true);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [loadingPlaceName, setLoadingPlaceName] = useState(false);

  // 地名を取得
  const loadPlaceName = useCallback(async () => {
    if (!location) return;

    setLoadingPlaceName(true);
    try {
      const result = await reverseGeocode(location.latitude, location.longitude);
      if (result) {
        // 簡潔な地名を構築（都道府県 + 市区町村 + 町域）
        const addr = result.address;
        const parts = [];
        if (addr.state) parts.push(addr.state);
        if (addr.city) parts.push(addr.city);
        if (addr.suburb) parts.push(addr.suburb);

        const simpleName = parts.length > 0 ? parts.join('') : result.displayName;
        setPlaceName(simpleName);
      } else {
        setPlaceName(null);
      }
    } catch (error) {
      console.error('Failed to load place name:', error);
      setPlaceName(null);
    } finally {
      setLoadingPlaceName(false);
    }
  }, [location]);

  // 現在地に移動
  const goToCurrentLocation = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsTracking(true);
    refreshLocation();
  }, [refreshLocation]);

  // 地図の領域変更時
  const onRegionChange = useCallback(() => {
    setIsTracking(false);
  }, []);

  // location変更時に地名を更新
  useEffect(() => {
    if (location) {
      loadPlaceName();
    }
  }, [location, loadPlaceName]);

  return {
    mapMode,
    setMapMode,
    isTracking,
    placeName,
    loadingPlaceName,
    goToCurrentLocation,
    onRegionChange,
  };
}
