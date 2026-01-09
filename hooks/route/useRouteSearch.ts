import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useRoute } from '@/lib/route-context';
import { searchAddress } from '@/lib/geocoding-service';
import { searchRoute } from '@/lib/route-service';
import { fetchBuildingsNearby } from '@/lib/plateau-service';
import { analyzeRouteShade, type RouteAnalysis } from '@/lib/shade-route-analyzer';

export function useRouteSearch(location: { latitude: number; longitude: number } | null) {
  const router = useRouter();
  const { setCurrentRoute, setIsRouteVisible } = useRoute();

  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [routes, setRoutes] = useState<RouteAnalysis[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchRoutes = useCallback(async () => {
    if (!destination.trim() || !location) {
      setError('出発地と目的地を入力してください');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSearching(true);
    setRoutes([]);
    setSelectedRoute(null);
    setError(null);

    try {
      // 目的地をジオコーディング
      const geocodeResults = await searchAddress(destination);
      if (geocodeResults.length === 0) {
        setError('目的地が見つかりませんでした');
        setIsSearching(false);
        return;
      }

      const destinationPoint = {
        latitude: geocodeResults[0].latitude,
        longitude: geocodeResults[0].longitude,
      };

      // ルートを検索
      const route = await searchRoute(
        { latitude: location.latitude, longitude: location.longitude },
        destinationPoint,
        'walking'
      );

      if (!route) {
        setError('ルートが見つかりませんでした');
        setIsSearching(false);
        return;
      }

      // 建物データを取得
      const buildings = await fetchBuildingsNearby(
        location.latitude,
        location.longitude,
        1000
      );

      // ルートを分析
      const analysis = await analyzeRouteShade(route, buildings);

      setRoutes([analysis]);
      setSelectedRoute('route-0');

      // ルートデータをコンテキストに保存
      setCurrentRoute(analysis);
      setIsRouteVisible(true);

      // マップタブに自動切り替え
      router.push('/(tabs)');
    } catch (err) {
      console.error('Route search error:', err);
      setError('ルート検索中にエラーが発生しました');
    } finally {
      setIsSearching(false);
    }
  }, [destination, location, router, setCurrentRoute, setIsRouteVisible]);

  const selectRoute = useCallback((routeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedRoute(routeId);
  }, []);

  const startNavigation = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  return {
    destination,
    setDestination,
    isSearching,
    routes,
    selectedRoute,
    error,
    searchRoutes,
    selectRoute,
    startNavigation,
  };
}
