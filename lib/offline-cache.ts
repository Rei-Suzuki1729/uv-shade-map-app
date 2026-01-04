/**
 * オフラインキャッシュマネージャー
 * 
 * AsyncStorageを使用してUVデータ、建物データ、設定を
 * ローカルにキャッシュし、オフライン時でも基本機能を提供
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = '@uv_shade_map:';

// キャッシュの有効期限（ミリ秒）
const CACHE_TTL = {
  UV_DATA: 5 * 60 * 1000,        // 5分（UVデータは頻繁に変化）
  BUILDING_DATA: 24 * 60 * 60 * 1000,  // 24時間（建物データは安定）
  SETTINGS: Infinity,            // 無期限（ユーザー設定）
  FAVORITE_LOCATIONS: Infinity,  // 無期限（お気に入り場所）
};

// キャッシュエントリの型
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// キャッシュされるデータの型
export interface CachedUVData {
  latitude: number;
  longitude: number;
  uvIndex: number;
  uvMax: number;
  uvMaxTime: string;
  safeExposureTime: number;
  timestamp: string;
}

export interface CachedBuildingData {
  areaId: string;
  buildings: Array<{
    id: string;
    coordinates: Array<{ lat: number; lng: number }>;
    height: number;
  }>;
  lastUpdated: string;
}

export interface FavoriteLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  addedAt: string;
}

/**
 * キャッシュにデータを保存
 */
async function setCache<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(entry)
    );
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

/**
 * キャッシュからデータを取得
 */
async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // TTLチェック
    if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
      // 期限切れ：キャッシュを削除
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * キャッシュを削除
 */
async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn('Cache remove error:', error);
  }
}

/**
 * 位置情報からキャッシュキーを生成
 * 小数点以下3桁で丸めて、近い位置のデータを共有
 */
function getLocationKey(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(3);
  const lng = longitude.toFixed(3);
  return `loc_${lat}_${lng}`;
}

/**
 * UVデータのキャッシュ操作
 */
export const uvDataCache = {
  async get(latitude: number, longitude: number): Promise<CachedUVData | null> {
    const key = `uv_${getLocationKey(latitude, longitude)}`;
    return getCache<CachedUVData>(key);
  },
  
  async set(data: CachedUVData): Promise<void> {
    const key = `uv_${getLocationKey(data.latitude, data.longitude)}`;
    await setCache(key, data, CACHE_TTL.UV_DATA);
  },
  
  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const uvKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}uv_`));
    await AsyncStorage.multiRemove(uvKeys);
  },
};

/**
 * 建物データのキャッシュ操作
 */
export const buildingDataCache = {
  async get(areaId: string): Promise<CachedBuildingData | null> {
    const key = `building_${areaId}`;
    return getCache<CachedBuildingData>(key);
  },
  
  async set(data: CachedBuildingData): Promise<void> {
    const key = `building_${data.areaId}`;
    await setCache(key, data, CACHE_TTL.BUILDING_DATA);
  },
  
  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const buildingKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}building_`));
    await AsyncStorage.multiRemove(buildingKeys);
  },
};

/**
 * お気に入り場所のキャッシュ操作
 */
export const favoriteLocationsCache = {
  async getAll(): Promise<FavoriteLocation[]> {
    const data = await getCache<FavoriteLocation[]>('favorites');
    return data || [];
  },
  
  async add(location: Omit<FavoriteLocation, 'id' | 'addedAt'>): Promise<FavoriteLocation> {
    const favorites = await this.getAll();
    const newLocation: FavoriteLocation = {
      ...location,
      id: `fav_${Date.now()}`,
      addedAt: new Date().toISOString(),
    };
    favorites.push(newLocation);
    await setCache('favorites', favorites, CACHE_TTL.FAVORITE_LOCATIONS);
    return newLocation;
  },
  
  async remove(id: string): Promise<void> {
    const favorites = await this.getAll();
    const filtered = favorites.filter(f => f.id !== id);
    await setCache('favorites', filtered, CACHE_TTL.FAVORITE_LOCATIONS);
  },
  
  async clear(): Promise<void> {
    await removeCache('favorites');
  },
};

/**
 * オフライン状態の管理
 */
export const offlineManager = {
  /**
   * オフラインモードかどうかを確認
   */
  async isOffline(): Promise<boolean> {
    // React Nativeでは NetInfo を使用するが、
    // ここではシンプルにフラグで管理
    const flag = await getCache<boolean>('offline_mode');
    return flag || false;
  },
  
  /**
   * オフラインモードを設定
   */
  async setOfflineMode(offline: boolean): Promise<void> {
    await setCache('offline_mode', offline, Infinity);
  },
  
  /**
   * キャッシュの統計情報を取得
   */
  async getCacheStats(): Promise<{
    uvDataCount: number;
    buildingDataCount: number;
    favoritesCount: number;
    totalSize: string;
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let uvCount = 0;
    let buildingCount = 0;
    let totalBytes = 0;
    
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalBytes += value.length;
        if (key.includes('uv_')) uvCount++;
        if (key.includes('building_')) buildingCount++;
      }
    }
    
    const favorites = await favoriteLocationsCache.getAll();
    
    return {
      uvDataCount: uvCount,
      buildingDataCount: buildingCount,
      favoritesCount: favorites.length,
      totalSize: formatBytes(totalBytes),
    };
  },
  
  /**
   * すべてのキャッシュをクリア
   */
  async clearAllCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },
  
  /**
   * 期限切れのキャッシュをクリーンアップ
   */
  async cleanupExpiredCache(): Promise<number> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    let cleanedCount = 0;
    
    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          const entry = JSON.parse(raw);
          if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        } catch {
          // 無効なエントリは削除
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  },
};

/**
 * バイト数を人間が読める形式に変換
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * エリアのデータを事前にダウンロード（オフライン用）
 */
export async function prefetchAreaData(
  latitude: number,
  longitude: number,
  radiusKm: number = 1
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // ここでは実際のAPI呼び出しの代わりにシミュレーション
    // 実際の実装では、UV APIとPLATEAU APIからデータを取得してキャッシュ
    
    const areaId = getLocationKey(latitude, longitude);
    
    // 建物データのシミュレーション保存
    const buildingData: CachedBuildingData = {
      areaId,
      buildings: [],  // 実際にはAPIから取得
      lastUpdated: new Date().toISOString(),
    };
    await buildingDataCache.set(buildingData);
    
    // UVデータのシミュレーション保存
    const uvData: CachedUVData = {
      latitude,
      longitude,
      uvIndex: 5,  // 実際にはAPIから取得
      uvMax: 8,
      uvMaxTime: '12:00',
      safeExposureTime: 40,
      timestamp: new Date().toISOString(),
    };
    await uvDataCache.set(uvData);
    
    return {
      success: true,
      message: `${radiusKm}km圏内のデータをダウンロードしました`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'データのダウンロードに失敗しました',
    };
  }
}
