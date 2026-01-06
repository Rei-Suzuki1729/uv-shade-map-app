/**
 * 地名・座標表示カードコンポーネント
 * 現在の地図中心の地名と座標を表示
 */

import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LocationInfoCardProps {
  placeName: string | null;
  latitude: number;
  longitude: number;
  loading?: boolean;
}

export function LocationInfoCard({ 
  placeName, 
  latitude, 
  longitude, 
  loading = false 
}: LocationInfoCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' }
    ]}>
      {loading ? (
        <Text style={[styles.placeName, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          読み込み中...
        </Text>
      ) : (
        <>
          {placeName && (
            <Text 
              style={[styles.placeName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {placeName}
            </Text>
          )}
          <Text style={[styles.coordinates, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '90%',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 13,
    fontWeight: '400',
  },
});
