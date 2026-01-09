/**
 * 地図関連の共通型定義
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Building {
  id: string;
  coordinates: Location[];
  height: number;
  name?: string;
}

export interface ShadowPolygon {
  coordinates: Location[];
  buildingId: string;
}

export interface UVData {
  uv: number;
  uvMax: number;
  uvMaxTime: string;
  ozone: number;
  safeExposureTime: {
    skinType1: number;
    skinType2: number;
    skinType3: number;
    skinType4: number;
    skinType5: number;
    skinType6: number;
  };
}

export type MapMode = 'standard' | 'uv' | 'shade';

export interface MapViewProps {
  location: Location;
  mapMode: MapMode;
  buildings: Building[];
  shadows: ShadowPolygon[];
  uvData: UVData | null;
  isDark: boolean;
  routeCoordinates?: Location[];
}
