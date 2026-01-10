import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { type MapMode } from '@/components/map-mode-selector';
import { type Building } from '@/lib/shade-calculator';
import { type ShadowPolygon } from '@/lib/advanced-shade-calculator';
import { type UVData } from '@/lib/uv-service';
import { getUVColor } from '@/constants/uv';
import { getCurrentShadeTileUrl } from '@/lib/tile-utils';

interface NativeMapViewProps {
  location: { latitude: number; longitude: number } | null;
  mapMode: MapMode;
  buildings: Building[];
  shadows: ShadowPolygon[];
  uvData: UVData | null;
  isDark: boolean;
  onRegionChange: () => void;
  routeCoordinates?: { latitude: number; longitude: number }[];
}

export function NativeMapView({
  location,
  mapMode,
  buildings,
  shadows,
  uvData,
  isDark,
  onRegionChange,
  routeCoordinates,
}: NativeMapViewProps) {
  // react-native-maps はネイティブのみで動作するため、Web環境ではrequireしないようにする
  // または呼び出し元でPlatformチェックを行っていることを前提とする
  if (Platform.OS === 'web') return null;

  /* eslint-disable @typescript-eslint/no-require-imports */
  const MapViewComponent = require('react-native-maps').default;
  const { Polygon, Polyline, Marker, UrlTile, PROVIDER_GOOGLE } = require('react-native-maps');
  /* eslint-enable @typescript-eslint/no-require-imports */

  // 日陰タイルURL（現在時刻のタイムバケット）
  const shadeTileUrl = getCurrentShadeTileUrl();

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
      {/* 日陰タイルオーバーレイ（PoC: Polygon → UrlTile に変更） */}
      {mapMode === 'shade' && (
        <UrlTile
          urlTemplate={shadeTileUrl}
          zIndex={1}
          maximumZ={19}
          minimumZ={10}
          flipY={false}
        />
      )}

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

      {/* ルート描画 */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <>
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#6366F1"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
          {/* 出発地マーカー */}
          <Marker
            coordinate={routeCoordinates[0]}
            title="出発地"
            pinColor="green"
          />
          {/* 目的地マーカー */}
          <Marker
            coordinate={routeCoordinates[routeCoordinates.length - 1]}
            title="目的地"
            pinColor="red"
          />
        </>
      )}
    </MapViewComponent>
  );
}

const styles = StyleSheet.create({
  nativeMap: {
    ...StyleSheet.absoluteFillObject,
  },
});
