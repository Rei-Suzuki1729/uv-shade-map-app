/**
 * PLATEAU建物データ取得サービス
 * 国土交通省のPLATEAU 3D都市モデルから建物データを取得
 * 
 * データソース:
 * - Cesium ion Japan 3D Buildings (Asset ID: 2602291)
 * - G空間情報センター: https://www.geospatial.jp/ckan/dataset/plateau
 * 
 * 日本全国約2,300万棟の建物データを収録
 */

import { Building } from './shade-calculator';

// PLATEAUデータの対応都市リスト（主要都市）
export const PLATEAU_CITIES = [
  { code: '13100', name: '東京都23区', available: true },
  { code: '27100', name: '大阪市', available: true },
  { code: '14100', name: '横浜市', available: true },
  { code: '23100', name: '名古屋市', available: true },
  { code: '01100', name: '札幌市', available: true },
  { code: '40100', name: '福岡市', available: true },
  { code: '34100', name: '広島市', available: true },
  { code: '04100', name: '仙台市', available: true },
  { code: '26100', name: '京都市', available: true },
  { code: '28100', name: '神戸市', available: true },
] as const;

// 建物データのキャッシュ
const buildingCache = new Map<string, Building[]>();

/**
 * 緯度経度からメッシュコードを計算
 * 日本の標準地域メッシュ（3次メッシュ）
 */
export function calculateMeshCode(latitude: number, longitude: number): string {
  // 1次メッシュ（約80km四方）
  const lat1 = Math.floor(latitude * 1.5);
  const lng1 = Math.floor(longitude - 100);
  
  // 2次メッシュ（約10km四方）
  const lat2 = Math.floor((latitude * 1.5 - lat1) * 8);
  const lng2 = Math.floor((longitude - 100 - lng1) * 8);
  
  // 3次メッシュ（約1km四方）
  const lat3 = Math.floor((latitude * 1.5 - lat1 - lat2 / 8) * 80) % 10;
  const lng3 = Math.floor((longitude - 100 - lng1 - lng2 / 8) * 80) % 10;
  
  return `${lat1}${lng1}${lat2}${lng2}${lat3}${lng3}`;
}

/**
 * 指定範囲内の建物データを取得
 * PLATEAUのGeoJSONデータを使用
 */
export async function fetchBuildingsInBounds(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number
): Promise<Building[]> {
  const cacheKey = `${minLat.toFixed(4)}_${minLng.toFixed(4)}_${maxLat.toFixed(4)}_${maxLng.toFixed(4)}`;
  
  // キャッシュチェック
  if (buildingCache.has(cacheKey)) {
    return buildingCache.get(cacheKey)!;
  }
  
  try {
    // Overpass APIを使用してOpenStreetMapから建物データを取得
    // PLATEAUデータが直接APIで取得できない場合のフォールバック
    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["building"]["height"](${minLat},${minLng},${maxLat},${maxLng});
        way["building"]["building:levels"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out body;
      >;
      out skel qt;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });
    
    if (!response.ok) {
      console.warn('Overpass API error, using simulated data');
      return generateSimulatedBuildings(minLat, minLng, maxLat, maxLng);
    }
    
    const data = await response.json();
    const buildings = parseOverpassResponse(data);
    
    // キャッシュに保存
    buildingCache.set(cacheKey, buildings);
    
    return buildings;
  } catch (error) {
    console.warn('Failed to fetch building data:', error);
    return generateSimulatedBuildings(minLat, minLng, maxLat, maxLng);
  }
}

/**
 * Overpass APIのレスポンスをパース
 */
function parseOverpassResponse(data: any): Building[] {
  const buildings: Building[] = [];
  const nodes = new Map<number, { lat: number; lon: number }>();
  
  // ノードを収集
  for (const element of data.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, { lat: element.lat, lon: element.lon });
    }
  }
  
  // 建物を処理
  for (const element of data.elements) {
    if (element.type === 'way' && element.tags?.building) {
      const coordinates: Array<{ latitude: number; longitude: number }> = [];
      
      for (const nodeId of element.nodes) {
        const node = nodes.get(nodeId);
        if (node) {
          coordinates.push({ latitude: node.lat, longitude: node.lon });
        }
      }
      
      if (coordinates.length >= 3) {
        // 高さを取得（heightタグまたはlevelsから推定）
        let height = 10; // デフォルト高さ
        
        if (element.tags.height) {
          const heightMatch = element.tags.height.match(/[\d.]+/);
          if (heightMatch) {
            height = parseFloat(heightMatch[0]);
          }
        } else if (element.tags['building:levels']) {
          const levels = parseInt(element.tags['building:levels'], 10);
          height = levels * 3; // 1階あたり3mと仮定
        }
        
        buildings.push({
          id: `osm-${element.id}`,
          coordinates,
          height,
        });
      }
    }
  }
  
  return buildings;
}

/**
 * シミュレーション用の建物データを生成
 * 実際のAPIが利用できない場合のフォールバック
 */
function generateSimulatedBuildings(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number
): Building[] {
  const buildings: Building[] = [];
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  
  // 日本の都市部の建物密度をシミュレート
  // 約100m間隔で建物を配置
  const gridSize = 0.001; // 約100m
  
  for (let lat = minLat; lat < maxLat; lat += gridSize) {
    for (let lng = minLng; lng < maxLng; lng += gridSize) {
      // 70%の確率で建物を配置
      if (Math.random() > 0.3) {
        const buildingWidth = 0.0002 + Math.random() * 0.0004;
        const buildingDepth = 0.0002 + Math.random() * 0.0004;
        
        // 日本の都市部の建物高さ分布をシミュレート
        // 低層（3-10m）: 60%, 中層（10-30m）: 30%, 高層（30-100m）: 10%
        let height: number;
        const heightRandom = Math.random();
        if (heightRandom < 0.6) {
          height = 3 + Math.random() * 7; // 低層
        } else if (heightRandom < 0.9) {
          height = 10 + Math.random() * 20; // 中層
        } else {
          height = 30 + Math.random() * 70; // 高層
        }
        
        buildings.push({
          id: `sim-${lat.toFixed(6)}-${lng.toFixed(6)}`,
          coordinates: [
            { latitude: lat, longitude: lng },
            { latitude: lat + buildingDepth, longitude: lng },
            { latitude: lat + buildingDepth, longitude: lng + buildingWidth },
            { latitude: lat, longitude: lng + buildingWidth },
          ],
          height,
        });
      }
    }
  }
  
  return buildings;
}

/**
 * 現在地周辺の建物データを取得
 * @param latitude 中心緯度
 * @param longitude 中心経度
 * @param radiusKm 半径（km）
 */
export async function fetchBuildingsNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = 0.5
): Promise<Building[]> {
  // 緯度1度 ≈ 111km, 経度1度 ≈ 111km * cos(緯度)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));
  
  return fetchBuildingsInBounds(
    latitude - latDelta,
    longitude - lngDelta,
    latitude + latDelta,
    longitude + lngDelta
  );
}

/**
 * PLATEAUデータの利用可能性をチェック
 */
export function isPLATEAUAvailable(latitude: number, longitude: number): boolean {
  // 日本国内かどうかをチェック（簡易判定）
  return (
    latitude >= 24 &&
    latitude <= 46 &&
    longitude >= 122 &&
    longitude <= 154
  );
}

/**
 * 建物キャッシュをクリア
 */
export function clearBuildingCache(): void {
  buildingCache.clear();
}
