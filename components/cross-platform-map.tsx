/**
 * クロスプラットフォーム対応マップコンポーネント
 * Web: シンプルなSVGベースのマップ表示
 * Native: react-native-maps
 */

import React from 'react';
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
}

// Web用のシンプルなマップ表示
function WebMapView({
  initialRegion,
  showsUserLocation,
  polygons = [],
  style,
}: CrossPlatformMapProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // SVGビューボックスの計算
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

  return (
    <View style={[styles.webMapContainer, style, { backgroundColor: isDark ? '#1a1a2e' : '#e8f4f8' }]}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* グリッド線 */}
        {[...Array(10)].map((_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={i * 40}
              y1={0}
              x2={i * 40}
              y2={viewBoxSize}
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={0.5}
            />
            <line
              x1={0}
              y1={i * 40}
              x2={viewBoxSize}
              y2={i * 40}
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={0.5}
            />
          </React.Fragment>
        ))}

        {/* ポリゴン（建物や影） */}
        {polygons.map((polygon) => {
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
            />
          );
        })}

        {/* 現在地マーカー */}
        {showsUserLocation && (
          <>
            <circle
              cx={centerX}
              cy={centerY}
              r={20}
              fill="#6366F140"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={8}
              fill="#6366F1"
              stroke="#FFFFFF"
              strokeWidth={3}
            />
          </>
        )}
      </svg>

      {/* マップ情報オーバーレイ */}
      <View style={[styles.mapOverlay, { backgroundColor: isDark ? '#1E293BCC' : '#FFFFFFCC' }]}>
        <Text style={[styles.coordText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {initialRegion.latitude.toFixed(4)}°N, {initialRegion.longitude.toFixed(4)}°E
        </Text>
        <Text style={[styles.zoomText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          ズーム: {(1 / initialRegion.latitudeDelta * 10).toFixed(1)}x
        </Text>
      </View>

      {/* Web版の説明 */}
      <View style={[styles.webNotice, { backgroundColor: isDark ? '#6366F120' : '#6366F110' }]}>
        <Text style={[styles.webNoticeText, { color: '#6366F1' }]}>
          📱 実機でExpo Goアプリを使用すると、フル機能の地図が表示されます
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
  mapOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 8,
  },
  coordText: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoomText: {
    fontSize: 10,
    marginTop: 2,
  },
  webNotice: {
    position: 'absolute',
    bottom: 20,
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
