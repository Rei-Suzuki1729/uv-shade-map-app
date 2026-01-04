/**
 * Web用Mapboxマップコンポーネント
 * 
 * Web環境でのみ使用される高機能な地図コンポーネント
 * Mapbox GL JSを使用してリッチな地図体験を提供
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Web環境でのみMapboxをインポート
let Map: any = null;
let Marker: any = null;
let Source: any = null;
let Layer: any = null;

if (Platform.OS === 'web') {
  try {
    const mapboxgl = require('mapbox-gl');
    const reactMapGl = require('react-map-gl');
    Map = reactMapGl.Map;
    Marker = reactMapGl.Marker;
    Source = reactMapGl.Source;
    Layer = reactMapGl.Layer;
    
    // Mapbox CSSをインポート
    require('mapbox-gl/dist/mapbox-gl.css');
  } catch (e) {
    console.warn('Mapbox GL JS could not be loaded');
  }
}

export interface ShadePolygon {
  id: string;
  coordinates: number[][];
  shadeIntensity: number; // 0-1
}

export interface UVHeatmapPoint {
  latitude: number;
  longitude: number;
  uvIndex: number;
}

export interface WebMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  mapStyle?: 'standard' | 'satellite' | 'dark';
  showUserLocation?: boolean;
  shadePolygons?: ShadePolygon[];
  uvHeatmapData?: UVHeatmapPoint[];
  displayMode?: 'standard' | 'uv' | 'shade';
  onPress?: (event: { latitude: number; longitude: number }) => void;
  onRegionChange?: (region: { latitude: number; longitude: number; zoom: number }) => void;
}

// Mapboxのスタイル URL
const MAP_STYLES = {
  standard: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// 公開用のMapboxトークン（デモ用）
// 本番環境では環境変数から取得することを推奨
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

export function WebMap({
  latitude,
  longitude,
  zoom = 15,
  mapStyle = 'standard',
  showUserLocation = true,
  shadePolygons = [],
  uvHeatmapData = [],
  displayMode = 'standard',
  onPress,
  onRegionChange,
}: WebMapProps) {
  const [viewState, setViewState] = useState({
    latitude,
    longitude,
    zoom,
  });

  // 地図スタイルの選択
  const selectedStyle = useMemo(() => {
    if (displayMode === 'shade') return MAP_STYLES.standard;
    if (displayMode === 'uv') return MAP_STYLES.standard;
    return MAP_STYLES[mapStyle];
  }, [mapStyle, displayMode]);

  // 日陰ポリゴンのGeoJSON
  const shadeGeoJson = useMemo(() => {
    if (shadePolygons.length === 0) return null;
    
    return {
      type: 'FeatureCollection' as const,
      features: shadePolygons.map(polygon => ({
        type: 'Feature' as const,
        properties: {
          shadeIntensity: polygon.shadeIntensity,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [polygon.coordinates],
        },
      })),
    };
  }, [shadePolygons]);

  // UVヒートマップのGeoJSON
  const uvHeatmapGeoJson = useMemo(() => {
    if (uvHeatmapData.length === 0) return null;
    
    return {
      type: 'FeatureCollection' as const,
      features: uvHeatmapData.map(point => ({
        type: 'Feature' as const,
        properties: {
          uvIndex: point.uvIndex,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
      })),
    };
  }, [uvHeatmapData]);

  // 地図クリックハンドラ
  const handleClick = useCallback((event: any) => {
    if (onPress && event.lngLat) {
      onPress({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    }
  }, [onPress]);

  // ビューステート変更ハンドラ
  const handleMove = useCallback((evt: any) => {
    setViewState(evt.viewState);
    if (onRegionChange) {
      onRegionChange({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
      });
    }
  }, [onRegionChange]);

  // Web環境でない場合はフォールバック
  if (Platform.OS !== 'web' || !Map) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          地図はWeb版でのみ利用可能です
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Map
        {...viewState}
        onMove={handleMove}
        onClick={handleClick}
        mapStyle={selectedStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* 現在地マーカー */}
        {showUserLocation && (
          <Marker latitude={latitude} longitude={longitude}>
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}

        {/* 日陰ポリゴンレイヤー */}
        {displayMode === 'shade' && shadeGeoJson && (
          <Source id="shade-source" type="geojson" data={shadeGeoJson}>
            <Layer
              id="shade-layer"
              type="fill"
              paint={{
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'shadeIntensity'],
                  0, 'rgba(100, 100, 100, 0.1)',
                  0.5, 'rgba(70, 70, 70, 0.3)',
                  1, 'rgba(40, 40, 40, 0.5)',
                ],
                'fill-outline-color': 'rgba(0, 0, 0, 0.2)',
              }}
            />
          </Source>
        )}

        {/* UVヒートマップレイヤー */}
        {displayMode === 'uv' && uvHeatmapGeoJson && (
          <Source id="uv-heatmap-source" type="geojson" data={uvHeatmapGeoJson}>
            <Layer
              id="uv-heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': [
                  'interpolate',
                  ['linear'],
                  ['get', 'uvIndex'],
                  0, 0,
                  11, 1,
                ],
                'heatmap-intensity': 1,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0, 255, 0, 0)',
                  0.2, 'rgba(34, 197, 94, 0.6)',
                  0.4, 'rgba(234, 179, 8, 0.7)',
                  0.6, 'rgba(249, 115, 22, 0.8)',
                  0.8, 'rgba(239, 68, 68, 0.9)',
                  1, 'rgba(168, 85, 247, 1)',
                ],
                'heatmap-radius': 30,
                'heatmap-opacity': 0.7,
              }}
            />
          </Source>
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default WebMap;
