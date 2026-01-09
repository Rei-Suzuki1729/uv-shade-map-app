import React from 'react';
import { View, StyleSheet } from 'react-native';
import { type MapMode } from '@/components/map-mode-selector';
import { type Building } from '@/lib/shade-calculator';
import { type ShadowPolygon } from '@/lib/advanced-shade-calculator';
import { type UVData } from '@/lib/uv-service';
import { getUVColor } from '@/constants/uv';

interface WebMapViewProps {
  location: { latitude: number; longitude: number } | null;
  mapMode: MapMode;
  buildings: Building[];
  shadows: ShadowPolygon[];
  uvData: UVData | null;
  isDark: boolean;
  routeCoordinates?: { latitude: number; longitude: number }[];
}

export function WebMapView({
  location,
  mapMode,
  buildings,
  shadows,
  uvData,
  isDark,
  routeCoordinates,
}: WebMapViewProps) {
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

        {/* ルート描画 */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <>
            {/* ルート線 */}
            <polyline
              points={routeCoordinates
                .map(coord => {
                  const { x, y } = toSvgCoords(coord.latitude, coord.longitude);
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#6366F1"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 出発地マーカー */}
            {(() => {
              const start = toSvgCoords(routeCoordinates[0].latitude, routeCoordinates[0].longitude);
              return (
                <>
                  <circle cx={start.x} cy={start.y} r={12} fill="#22C55E" stroke="#FFFFFF" strokeWidth={3} />
                  <text x={start.x} y={start.y + 25} textAnchor="middle" fill={isDark ? '#FFFFFF' : '#000000'} fontSize="12" fontWeight="bold">
                    出発
                  </text>
                </>
              );
            })()}
            {/* 目的地マーカー */}
            {(() => {
              const end = toSvgCoords(
                routeCoordinates[routeCoordinates.length - 1].latitude,
                routeCoordinates[routeCoordinates.length - 1].longitude
              );
              return (
                <>
                  <circle cx={end.x} cy={end.y} r={12} fill="#EF4444" stroke="#FFFFFF" strokeWidth={3} />
                  <text x={end.x} y={end.y + 25} textAnchor="middle" fill={isDark ? '#FFFFFF' : '#000000'} fontSize="12" fontWeight="bold">
                    目的
                  </text>
                </>
              );
            })()}
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

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
});
