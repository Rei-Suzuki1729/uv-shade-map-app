/**
 * ホーム画面（マップ）
 * UV指数と日陰を可視化するメイン画面
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 地図のスタイル（ダークモード用）
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<MapView>(null);
  
  // 状態管理
  const { location, loading: locationLoading, refresh: refreshLocation } = useLocation();
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [uvData, setUVData] = useState<UVData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [shadows, setShadows] = useState<ShadowPolygon[]>([]);
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isTracking, setIsTracking] = useState(true);

  // 現在地が変更されたらデータを取得
  useEffect(() => {
    if (location) {
      loadData();
    }
  }, [location]);

  // 時間が変更されたら影を再計算
  useEffect(() => {
    if (location && buildings.length > 0) {
      const newSunPosition = getSunPosition(selectedTime, location.latitude, location.longitude);
      setSunPosition(newSunPosition);
      
      if (isSunAboveHorizon(newSunPosition)) {
        const newShadows = calculateAllShadows(buildings, newSunPosition, location.latitude);
        setShadows(newShadows);
      } else {
        setShadows([]);
      }
    }
  }, [selectedTime, buildings, location]);

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
        0.3 // 300m半径
      );
      setBuildings(buildingData);
      
      // 太陽位置と影を計算
      const now = new Date();
      setSelectedTime(now);
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
    
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
      setIsTracking(true);
    } else {
      refreshLocation();
    }
  }, [location, refreshLocation]);

  // 地図の領域変更時
  const onRegionChange = useCallback(() => {
    setIsTracking(false);
  }, []);

  // 初期領域
  const initialRegion = useMemo(() => ({
    latitude: location?.latitude ?? 35.6812,
    longitude: location?.longitude ?? 139.7671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  }), [location]);

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
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* 地図 */}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          onRegionChangeComplete={onRegionChange}
          customMapStyle={isDark ? darkMapStyle : undefined}
        >
          {/* 建物ポリゴン（日陰モード時） */}
          {mapMode === 'shade' && buildings.map((building) => (
            <Polygon
              key={`building-${building.id}`}
              coordinates={building.coordinates}
              fillColor={isDark ? 'rgba(100, 116, 139, 0.6)' : 'rgba(71, 85, 105, 0.5)'}
              strokeColor={isDark ? '#64748B' : '#475569'}
              strokeWidth={1}
            />
          ))}
          
          {/* 影ポリゴン（日陰モード時） */}
          {mapMode === 'shade' && shadows.map((shadow, index) => (
            <Polygon
              key={`shadow-${shadow.buildingId}-${index}`}
              coordinates={shadow.coordinates}
              fillColor={`rgba(30, 58, 95, ${shadow.opacity * 0.7})`}
              strokeColor="transparent"
              strokeWidth={0}
            />
          ))}
          
          {/* UVヒートマップ（ヒートマップモード時） */}
          {mapMode === 'heatmap' && uvData && location && (
            <>
              {/* 簡易ヒートマップ表示 */}
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
            </>
          )}
        </MapView>

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
          
          {/* 日陰情報（日陰モード時） */}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
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
});
