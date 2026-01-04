/**
 * クロスプラットフォーム対応マップコンポーネント
 * Web: Leaflet（OpenStreetMap）ベースのマップ表示
 * Native: react-native-maps
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapPolygon {
  id: string;
  coordinates: MapCoordinate[];
  fillColor: string;
  strokeColor: string;
  strokeWidth?: number;
}

export interface CrossPlatformMapProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  polygons?: MapPolygon[];
  onRegionChange?: () => void;
  children?: React.ReactNode;
  style?: any;
  displayMode?: 'standard' | 'uv' | 'shade';
}

// Web用のインタラクティブなマップ表示（iframe + OpenStreetMap）
function WebMapView({
  initialRegion,
  showsUserLocation,
  polygons = [],
  style,
  displayMode = 'standard',
}: CrossPlatformMapProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // OpenStreetMapのiframe URL
  const mapUrl = useMemo(() => {
    const zoom = Math.round(14 - Math.log2(initialRegion.latitudeDelta * 100));
    const boundedZoom = Math.max(10, Math.min(18, zoom));
    return `https://www.openstreetmap.org/export/embed.html?bbox=${
      initialRegion.longitude - initialRegion.longitudeDelta
    }%2C${
      initialRegion.latitude - initialRegion.latitudeDelta
    }%2C${
      initialRegion.longitude + initialRegion.longitudeDelta
    }%2C${
      initialRegion.latitude + initialRegion.latitudeDelta
    }&layer=mapnik&marker=${initialRegion.latitude}%2C${initialRegion.longitude}`;
  }, [initialRegion]);

  // SVGオーバーレイの計算
  const viewBoxSize = 400;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;

  // 座標をSVG座標に変換
  const toSvgCoords = (lat: number, lng: number) => {
    const scale = viewBoxSize / (initialRegion.latitudeDelta * 2);
    const x = centerX + (lng - initialRegion.longitude) * scale * 100;
    const y = centerY - (lat - initialRegion.latitude) * scale * 100;
    return { x, y };
  };

  // UVヒートマップのグラデーション色
  const getUVGradientColor = (intensity: number) => {
    if (intensity < 0.2) return 'rgba(34, 197, 94, 0.4)';
    if (intensity < 0.4) return 'rgba(234, 179, 8, 0.5)';
    if (intensity < 0.6) return 'rgba(249, 115, 22, 0.6)';
    if (intensity < 0.8) return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(168, 85, 247, 0.8)';
  };

  return (
    <View style={[styles.webMapContainer, style]}>
      {/* OpenStreetMap iframe */}
      <iframe
        src={mapUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        title="Map"
        loading="lazy"
      />

      {/* オーバーレイレイヤー（日陰・UVヒートマップ） */}
      {(displayMode === 'shade' || displayMode === 'uv') && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {/* 日陰モード：ポリゴン表示 */}
            {displayMode === 'shade' && polygons.map((polygon) => {
              const points = polygon.coordinates
                .map((coord) => {
                  const { x, y } = toSvgCoords(coord.latitude, coord.longitude);
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <polygon
                  key={polygon.id}
                  points={points}
                  fill={polygon.fillColor}
                  stroke={polygon.strokeColor}
                  strokeWidth={polygon.strokeWidth || 1}
                  opacity={0.7}
                />
              );
            })}

            {/* UVモード：ヒートマップグラデーション */}
            {displayMode === 'uv' && (
              <>
                <defs>
                  <radialGradient id="uvGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.6)" />
                    <stop offset="50%" stopColor="rgba(249, 115, 22, 0.4)" />
                    <stop offset="100%" stopColor="rgba(234, 179, 8, 0.2)" />
                  </radialGradient>
                </defs>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={viewBoxSize * 0.4}
                  fill="url(#uvGradient)"
                />
              </>
            )}
          </svg>
        </View>
      )}

      {/* 現在地マーカー（オーバーレイ） */}
      {showsUserLocation && (
        <View style={styles.userLocationMarker}>
          <View style={styles.userLocationPulse} />
          <View style={styles.userLocationDot} />
        </View>
      )}

      {/* モード表示バッジ */}
      <View style={[styles.modeBadge, { backgroundColor: isDark ? '#1E293BEE' : '#FFFFFFEE' }]}>
        <Text style={[styles.modeBadgeText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {displayMode === 'standard' && '🗺️ 標準'}
          {displayMode === 'uv' && '☀️ UV指数'}
          {displayMode === 'shade' && '🌳 日陰'}
        </Text>
      </View>
    </View>
  );
}

// ネイティブ用のマップ（react-native-maps）
function NativeMapView(props: CrossPlatformMapProps) {
  // 動的インポートでreact-native-mapsを読み込み
  const MapView = require('react-native-maps').default;
  const { Polygon, PROVIDER_GOOGLE } = require('react-native-maps');

  const {
    initialRegion,
    showsUserLocation,
    polygons = [],
    onRegionChange,
    children,
    style,
  } = props;

  return (
    <MapView
      style={[styles.nativeMap, style]}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      onRegionChangeComplete={onRegionChange}
    >
      {polygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          coordinates={polygon.coordinates}
          fillColor={polygon.fillColor}
          strokeColor={polygon.strokeColor}
          strokeWidth={polygon.strokeWidth || 1}
        />
      ))}
      {children}
    </MapView>
  );
}

// プラットフォームに応じたコンポーネントを選択
export function CrossPlatformMap(props: CrossPlatformMapProps) {
  if (Platform.OS === 'web') {
    return <WebMapView {...props} />;
  }
  return <NativeMapView {...props} />;
}

const styles = StyleSheet.create({
  webMapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  nativeMap: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  userLocationMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  userLocationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
