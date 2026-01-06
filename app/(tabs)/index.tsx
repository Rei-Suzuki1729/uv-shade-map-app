/**
 * ホーム画面（マップ）
 * UV指数と日陰を可視化するメイン画面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenContainer } from '@/components/screen-container';
import { UVCard } from '@/components/uv-card';
import { MapModeSelector, type MapMode } from '@/components/map-mode-selector';
import { SearchBar } from '@/components/search-bar';
import { LocationButton } from '@/components/location-button';
import { LocationInfoCard } from '@/components/location-info-card';
import { useLocation } from '@/hooks/use-location';
import { reverseGeocode } from '@/lib/geocoding-service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type UVData, getUVData } from '@/lib/uv-service';
import { getApiBaseUrl } from '@/constants/oauth';
import { trpc } from '@/lib/trpc';
import { fetchBuildingsNearby } from '@/lib/plateau-service';
import {
  getSunPosition,
  calculateAllShadows,
  isSunAboveHorizon,
  type ShadowPolygon,
  type SunPosition,
} from '@/lib/advanced-shade-calculator';
import { Building } from '@/lib/shade-calculator';
import { getUVColor, getUVLevel, getSkinAdvice } from '@/constants/uv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// マップビューコンポーネント
function MapView({
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
  const scale = 50000;

  const toSvgCoords = (lat: number, lng: number) => {
    if (!location) return { x: centerX, y: centerY };
    const x = centerX + (lng - location.longitude) * scale;
    const y = centerY - (lat - location.latitude) * scale;
    return { x, y };
  };

  // UV指数に基づく背景グラデーション
  const getBackgroundColor = () => {
    if (mapMode === 'heatmap' && uvData) {
      const uvColor = getUVColor(uvData.uv);
      return isDark ? `${uvColor}15` : `${uvColor}10`;
    }
    return isDark ? '#1a1a2e' : '#f0f7ff';
  };

  return (
    <View style={[styles.mapContainer, { backgroundColor: getBackgroundColor() }]}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* 背景グリッド */}
        {[...Array(21)].map((_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={i * 20}
              y1={0}
              x2={i * 20}
              y2={viewBoxSize}
              stroke={isDark ? '#334155' : '#e2e8f0'}
              strokeWidth={0.3}
              opacity={0.4}
            />
            <line
              x1={0}
              y1={i * 20}
              x2={viewBoxSize}
              y2={i * 20}
              stroke={isDark ? '#334155' : '#e2e8f0'}
              strokeWidth={0.3}
              opacity={0.4}
            />
          </React.Fragment>
        ))}

        {/* 道路のシミュレーション */}
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={viewBoxSize}
          stroke={isDark ? '#475569' : '#cbd5e1'}
          strokeWidth={8}
        />
        <line
          x1={0}
          y1={centerY}
          x2={viewBoxSize}
          y2={centerY}
          stroke={isDark ? '#475569' : '#cbd5e1'}
          strokeWidth={8}
        />

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
              fill={isDark ? 'rgba(100, 116, 139, 0.7)' : 'rgba(71, 85, 105, 0.6)'}
              stroke={isDark ? '#94a3b8' : '#64748b'}
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
              fill={isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(30, 58, 95, 0.4)'}
              stroke="none"
            />
          );
        })}

        {/* UVヒートマップ（ヒートマップモード時） */}
        {mapMode === 'heatmap' && uvData && (
          <>
            <defs>
              <radialGradient id="uvGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getUVColor(uvData.uv)} stopOpacity={0.6} />
                <stop offset="100%" stopColor={getUVColor(uvData.uv)} stopOpacity={0.1} />
              </radialGradient>
            </defs>
            <circle
              cx={centerX}
              cy={centerY}
              r={150}
              fill="url(#uvGradient)"
            />
          </>
        )}

        {/* 現在地マーカー */}
        <circle
          cx={centerX}
          cy={centerY}
          r={20}
          fill="#6366F120"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill="#6366F1"
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      </svg>
    </View>
  );
}

// ネイティブマップビュー
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
  const MapViewComponent = require('react-native-maps').default;
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
    <MapViewComponent
      style={styles.nativeMap}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      onRegionChangeComplete={onRegionChange}
      customMapStyle={isDark ? darkMapStyle : undefined}
    >
      {mapMode === 'shade' && buildings.map((building) => (
        <Polygon
          key={`building-${building.id}`}
          coordinates={building.coordinates}
          fillColor={isDark ? 'rgba(100, 116, 139, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
          strokeColor={isDark ? '#64748B' : '#475569'}
          strokeWidth={1}
        />
      ))}

      {mapMode === 'shade' && shadows.map((shadow, index) => (
        <Polygon
          key={`shadow-${shadow.buildingId}-${index}`}
          coordinates={shadow.coordinates}
          fillColor={`rgba(30, 58, 95, ${shadow.opacity * 0.7})`}
          strokeColor="transparent"
          strokeWidth={0}
        />
      ))}

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
    </MapViewComponent>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation();
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [uvData, setUVData] = useState<UVData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [shadows, setShadows] = useState<ShadowPolygon[]>([]);
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [loadingPlaceName, setLoadingPlaceName] = useState(false);

  // 現在地が変更されたらデータを取得
  useEffect(() => {
    if (location) {
      loadData();
      loadPlaceName();
    }
  }, [location]);

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

  // データ読み込み（キャッシュ対応）
  const loadData = useCallback(async () => {
    if (!location) return;

    setIsLoadingData(true);
    setDataError(null);

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

      // 太陽位置と影を計算
      const now = new Date();
      const newSunPosition = getSunPosition(now, location.latitude, location.longitude);
      setSunPosition(newSunPosition);

      if (isSunAboveHorizon(newSunPosition)) {
        const newShadows = calculateAllShadows(buildingData, newSunPosition, location.latitude);
        setShadows(newShadows);
      } else {
        setShadows([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setDataError('データの取得に失敗しました');
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
        <MapView
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
  mapContainer: {
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dataErrorText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
