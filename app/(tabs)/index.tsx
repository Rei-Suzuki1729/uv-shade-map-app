/**
 * ホーム画面（マップ）
 * UV指数と日陰を可視化するメイン画面
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/screen-container';
import { UVCard } from '@/components/uv-card';
import { MapModeSelector } from '@/components/map-mode-selector';
import { SearchBar } from '@/components/search-bar';
import { LocationButton } from '@/components/location-button';
import { LocationInfoCard } from '@/components/location-info-card';
import { useLocation } from '@/hooks/use-location';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoute } from '@/lib/route-context';
import { isSunAboveHorizon } from '@/lib/advanced-shade-calculator';
import { getUVLevel, getSkinAdvice } from '@/constants/uv';

import { WebMapView } from '@/components/map/WebMapView';
import { NativeMapView } from '@/components/map/NativeMapView';
import { useMapData } from '@/hooks/map/useMapData';
import { useMapControls } from '@/hooks/map/useMapControls';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { location, refresh: refreshLocation } = useLocation();
  const { currentRoute, isRouteVisible } = useRoute();

  // マップデータと状態管理のフック
  const {
    uvData,
    buildings,
    shadows,
    sunPosition,
    isLoading: isLoadingData,
    error: dataError
  } = useMapData(location);

  const {
    mapMode,
    setMapMode,
    isTracking,
    placeName,
    loadingPlaceName,
    goToCurrentLocation,
    onRegionChange,
  } = useMapControls(location, refreshLocation);
  
  // ルート座標を取得
  const routeCoordinates = useMemo(() => {
    if (!currentRoute || !isRouteVisible) return undefined;
    return currentRoute.route.geometry;
  }, [currentRoute, isRouteVisible]);

  // UV情報のメモ化
  const uvInfo = useMemo(() => {
    if (!uvData) return null;
    return {
      level: getUVLevel(uvData.uv),
      advice: getSkinAdvice(uvData.uv),
    };
  }, [uvData]);

  // 位置情報がない場合はローディング表示
  if (!location) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          読み込み中...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.container}>
      {/* 地図 */}
      {Platform.OS === 'web' ? (
        <WebMapView
          location={location}
          mapMode={mapMode}
          buildings={buildings}
          shadows={shadows}
          uvData={uvData}
          isDark={isDark}
          routeCoordinates={routeCoordinates}
        />
      ) : (
        <NativeMapView
          location={location}
          mapMode={mapMode}
          buildings={buildings}
          shadows={shadows}
          uvData={uvData}
          isDark={isDark}
          onRegionChange={onRegionChange}
          routeCoordinates={routeCoordinates}
        />
      )}

      {/* 上部UI */}
      <View style={[styles.topContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="場所を検索"
            onSubmit={(text) => console.log('Search:', text)}
          />
        </View>

        {location && (
          <View style={styles.locationInfoContainer}>
            <LocationInfoCard
              placeName={placeName}
              latitude={location.latitude}
              longitude={location.longitude}
              loading={loadingPlaceName}
            />
          </View>
        )}

        {uvData && (
          <View style={styles.uvCardContainer}>
            <UVCard uvIndex={uvData.uv} compact />
          </View>
        )}

        <View style={styles.modeSelectorContainer}>
          <MapModeSelector currentMode={mapMode} onModeChange={setMapMode} />
        </View>
      </View>

      {/* 右側コントロール */}
      <View style={[styles.rightControls, { top: insets.top + 200 }]}>
        <LocationButton
          onPress={goToCurrentLocation}
          isTracking={isTracking}
        />
      </View>

      {/* 下部情報パネル */}
      <View style={[
        styles.bottomPanel,
        {
          paddingBottom: insets.bottom + 80,
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        }
      ]}>
        {/* UV情報 */}
        {uvInfo && (
          <View style={styles.uvInfoSection}>
            <Text style={[styles.uvAdvice, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {uvInfo.advice}
            </Text>
          </View>
        )}

        {/* 日陰モード時の情報 */}
        {mapMode === 'shade' && sunPosition && (
          <View style={styles.shadeInfo}>
            <Text style={[styles.shadeInfoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {isSunAboveHorizon(sunPosition)
                ? `${shadows.length}箇所の日陰エリアを表示中`
                : '現在は夜間のため日陰表示はありません'}
            </Text>
          </View>
        )}

        {/* ローディング */}
        {isLoadingData && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        )}

        {/* エラー */}
        {dataError && (
          <Text style={[styles.dataErrorText, { color: '#EF4444' }]}>
            {dataError}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchContainer: {
    marginBottom: 12,
  },
  locationInfoContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  uvCardContainer: {
    marginBottom: 12,
  },
  modeSelectorContainer: {
    alignSelf: 'center',
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    gap: 12,
    zIndex: 10,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      },
    }),
  },
  uvInfoSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  uvAdvice: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  shadeInfo: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  shadeInfoText: {
    fontSize: 13,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dataErrorText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
