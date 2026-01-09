/**
 * 地図関連の定数
 */

// デフォルト位置（東京駅）
export const DEFAULT_LOCATION = {
  latitude: 35.6812,
  longitude: 139.7671,
};

// 地図のズームレベル
export const MAP_ZOOM = {
  DEFAULT: 16,
  MIN: 10,
  MAX: 20,
};

// 地図のサイズ設定
export const MAP_SIZE = {
  TILE_SIZE: 256,
  METERS_PER_PIXEL: 0.5, // ズームレベル16での1ピクセルあたりのメートル数
};

// 色設定
export const MAP_COLORS = {
  ROUTE_LINE: '#6366F1',
  START_MARKER: '#22C55E',
  END_MARKER: '#EF4444',
  CURRENT_LOCATION: '#6366F1',
  SHADOW: '#00000040',
  UV_GRADIENT_START: '#FEF3C7',
  UV_GRADIENT_END: '#DC2626',
};

// スタイル設定
export const MAP_STYLES = {
  ROUTE_LINE_WIDTH: 4,
  MARKER_RADIUS: 12,
  MARKER_STROKE_WIDTH: 3,
  CURRENT_LOCATION_RADIUS: 8,
  CURRENT_LOCATION_HALO_RADIUS: 20,
};

// アニメーション設定
export const MAP_ANIMATION = {
  DURATION: 300,
  EASING: 'ease-out' as const,
};
