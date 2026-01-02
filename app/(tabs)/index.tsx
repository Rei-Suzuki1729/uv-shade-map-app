/**
 * ホーム画面（マップ）
 * UV指数と日陰を可視化するメイン画面
 * Web/iOS/Android対応
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { UVCard } from '@/components/uv-card';
import { MapModeSelector, type MapMode } from '@/components/map-mode-selector';
import { SearchBar } from '@/components/search-bar';
import { LocationButton } from '@/components/location-button';
import { useLocation } from '@/hooks/use-location';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUVData, type UVData } from '@/lib/uv-service';
import { fetchBuildingsNearby } from '@/lib/plateau-service';
import {
  getSunPosition,
  calculateAllShadows,
  isSunAboveHorizon,
  type ShadowPolygon,
  type SunPosition,
} from '@/lib/advanced-shade-calculator';
import { Building } from '@/lib/shade-calculator';
import { getUVColor } from '@/constants/uv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Web用のシンプルなマップビュー
function SimpleMapView({
  location,
  mapMode,
  buildings,
  shadows,
  uvData,
  isDark,
}: {
  location: { latitude: number; longitude: number } | null;
  mapMode: MapMode;
  buildings: Building[];
  shadows: ShadowPolygon[];
  uvData: UVData | null;
  isDark: boolean;
}) {
  const viewBoxSize = 400;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const scale = 50000; // 1度あたりのピクセル数

  const toSvgCoords = (lat: number, lng: number) => {
    if (!location) return { x: centerX, y: centerY };
    const x = centerX + (lng - location.longitude) * scale;
    const y = centerY - (lat - location.latitude) * scale;
    return { x, y };
  };

  return (
    <View style={[styles.webMapContainer, { backgroundColor: isDark ? '#1a1a2e' : '#e8f4f8' }]}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* グリッド線 */}
        {[...Array(21)].map((_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={i * 20}
              y1={0}
              x2={i * 20}
              y2={viewBoxSize}
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={0.3}
              opacity={0.5}
            />
            <line
              x1={0}
              y1={i * 20}
              x2={viewBoxSize}
              y2={i * 20}
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={0.3}
              opacity={0.5}
            />
          </React.Fragment>
        ))}

        {/* 建物ポリゴン（日陰モード時） */}
        {mapMode === 'shade' && buildings.map((building) => {
          const points = building.coordinates
            .map((coord) => {
              const { x, y } = toSvgCoords(coord.latitude, coord.longitude);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <polygon
              key={`building-${building.id}`}
              points={points}
              fill={isDark ? 'rgba(100, 116, 139, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
              stroke={isDark ? '#64748B' : '#475569'}
              strokeWidth={1}
            />
          );
        })}

        {/* 影ポリゴン（日陰モード時） */}
        {mapMode === 'shade' && shadows.map((shadow, index) => {
          const points = shadow.coordinates
            .map((coord) => {
              const { x, y } = toSvgCoords(coord.latitude, coord.longitude);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <polygon
              key={`shadow-${shadow.buildingId}-${index}`}
              points={points}
              fill={`rgba(30, 58, 95, ${shadow.opacity * 0.7})`}
              stroke="none"
            />
          );
        })}

        {/* UVヒートマップ（ヒートマップモード時） */}
        {mapMode === 'heatmap' && uvData && (
          <rect
            x={centerX - 100}
            y={centerY - 100}
            width={200}
            height={200}
            fill={`${getUVColor(uvData.uv)}40`}
            stroke={getUVColor(uvData.uv)}
            strokeWidth={2}
            rx={10}
          />
        )}

        {/* 現在地マーカー */}
        <circle
          cx={centerX}
          cy={centerY}
          r={25}
          fill="#6366F130"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={10}
          fill="#6366F1"
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      </svg>

      {/* 座標表示 */}
      {location && (
        <View style={[styles.coordOverlay, { backgroundColor: isDark ? '#1E293BDD' : '#FFFFFFDD' }]}>
          <Text style={[styles.coordText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            📍 {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
          </Text>
        </View>
      )}

      {/* Web版の説明 */}
      <View style={[styles.webNotice, { backgroundColor: isDark ? '#6366F120' : '#6366F110' }]}>
        <Text style={[styles.webNoticeText, { color: '#6366F1' }]}>
          📱 Expo Goアプリで実機テストすると、フル機能の地図が表示されます
        </Text>
      </View>
    </View>
  );
}

// ネイティブ用のマップビュー
function NativeMapView({
  location,
  mapMode,
  buildings,
  shadows,
  uvData,
  isDark,
  onRegionChange,
}: {
  location: { latitude: number; longitude: number } | null;
  mapMode: MapMode;
  buildings: Building[];
  shadows: ShadowPolygon[];
  uvData: UVData | null;
  isDark: boolean;
  onRegionChange: () => void;
}) {
  // 動的インポート
  const MapView = require('react-native-maps').default;
  const { Polygon, PROVIDER_GOOGLE } = require('react-native-maps');

  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  ];

  const initialRegion = {
    latitude: location?.latitude ?? 35.6812,
    longitude: location?.longitude ?? 139.7671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <MapView
      style={styles.nativeMap}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      onRegionChangeComplete={onRegionChange}
      customMapStyle={isDark ? darkMapStyle : undefined}
    >
      {/* 建物ポリゴン */}
      {mapMode === 'shade' && buildings.map((building) => (
        <Polygon
          key={`building-${building.id}`}
          coordinates={building.coordinates}
          fillColor={isDark ? 'rgba(100, 116, 139, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
          strokeColor={isDark ? '#64748B' : '#475569'}
          strokeWidth={1}
        />
      ))}

      {/* 影ポリゴン */}
      {mapMode === 'shade' && shadows.map((shadow, index) => (
        <Polygon
          key={`shadow-${shadow.buildingId}-${index}`}
          coordinates={shadow.coordinates}
          fillColor={`rgba(30, 58, 95, ${shadow.opacity * 0.7})`}
          strokeColor="transparent"
          strokeWidth={0}
        />
      ))}

      {/* UVヒートマップ */}
      {mapMode === 'heatmap' && uvData && location && (
        <Polygon
          coordinates={[
            { latitude: location.latitude - 0.003, longitude: location.longitude - 0.003 },
            { latitude: location.latitude + 0.003, longitude: location.longitude - 0.003 },
            { latitude: location.latitude + 0.003, longitude: location.longitude + 0.003 },
            { latitude: location.latitude - 0.003, longitude: location.longitude + 0.003 },
          ]}
          fillColor={`${getUVColor(uvData.uv)}40`}
          strokeColor={getUVColor(uvData.uv)}
          strokeWidth={2}
        />
      )}
    </MapView>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 状態管理
  const { location, loading: locationLoading, refresh: refreshLocation } = useLocation();
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [uvData, setUVData] = useState<UVData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [shadows, setShadows] = useState<ShadowPolygon[]>([]);
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isTracking, setIsTracking] = useState(true);

  // 現在地が変更されたらデータを取得
  useEffect(() => {
    if (location) {
      loadData();
    }
  }, [location]);

  // データ読み込み
  const loadData = useCallback(async () => {
    if (!location) return;

    setIsLoadingData(true);

    try {
      // UV指数データを取得
      const uv = await getUVData(location.latitude, location.longitude);
      setUVData(uv);

      // 建物データを取得
      const buildingData = await fetchBuildingsNearby(
        location.latitude,
        location.longitude,
        0.3
      );
      setBuildings(buildingData);

      // 太陽位置と影を計算
      const now = new Date();
      const newSunPosition = getSunPosition(now, location.latitude, location.longitude);
      setSunPosition(newSunPosition);

      if (isSunAboveHorizon(newSunPosition)) {
        const newShadows = calculateAllShadows(buildingData, newSunPosition, location.latitude);
        setShadows(newShadows);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingData(false);
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

  // ローディング表示
  if (locationLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          位置情報を取得中...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.container}>
      {/* 地図 */}
      {Platform.OS === 'web' ? (
        <SimpleMapView
          location={location}
          mapMode={mapMode}
          buildings={buildings}
          shadows={shadows}
          uvData={uvData}
          isDark={isDark}
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
        />
      )}

      {/* 上部UI */}
      <View style={[styles.topContainer, { paddingTop: insets.top + 8 }]}>
        {/* 検索バー */}
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="場所を検索"
            onSubmit={(text) => console.log('Search:', text)}
          />
        </View>

        {/* UV指数カード */}
        {uvData && (
          <View style={styles.uvCardContainer}>
            <UVCard uvIndex={uvData.uv} compact />
          </View>
        )}

        {/* 表示モード切替 */}
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
        {/* 太陽情報 */}
        {sunPosition && (
          <View style={styles.sunInfo}>
            <Text style={[styles.sunInfoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              太陽高度
            </Text>
            <Text style={[styles.sunInfoValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {sunPosition.altitudeDegrees.toFixed(1)}°
            </Text>
            <Text style={[styles.sunInfoLabel, { color: isDark ? '#94A3B8' : '#64748B', marginLeft: 16 }]}>
              方位
            </Text>
            <Text style={[styles.sunInfoValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {sunPosition.azimuthDegrees.toFixed(1)}°
            </Text>
          </View>
        )}

        {/* 日陰情報 */}
        {mapMode === 'shade' && (
          <View style={styles.shadeInfo}>
            <Text style={[styles.shadeInfoText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {shadows.length > 0
                ? `${buildings.length}棟の建物から${shadows.length}個の影を表示中`
                : sunPosition && !isSunAboveHorizon(sunPosition)
                  ? '現在は夜間です'
                  : '建物データを読み込み中...'}
            </Text>
          </View>
        )}

        {/* ローディング表示 */}
        {isLoadingData && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={[styles.loadingSmallText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              データ読み込み中...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webMapContainer: {
    flex: 1,
    position: 'relative',
  },
  nativeMap: {
    ...StyleSheet.absoluteFillObject,
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
  sunInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  sunInfoLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  sunInfoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  shadeInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  shadeInfoText: {
    fontSize: 13,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingSmallText: {
    fontSize: 13,
  },
  coordOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 8,
  },
  coordText: {
    fontSize: 12,
    fontWeight: '500',
  },
  webNotice: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
  },
  webNoticeText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
