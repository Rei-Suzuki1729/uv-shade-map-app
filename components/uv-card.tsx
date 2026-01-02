/**
 * UV指数カードコンポーネント
 * 現在のUV指数と肌への影響を表示
 */

import { View, Text, StyleSheet } from 'react-native';
import { getUVLevel, getSafeExposureTime, type UVLevel } from '@/constants/uv';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface UVCardProps {
  uvIndex: number;
  skinType?: number;
  compact?: boolean;
}

export function UVCard({ uvIndex, skinType = 3, compact = false }: UVCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const uvInfo = getUVLevel(uvIndex);
  const safeTime = getSafeExposureTime(uvIndex, skinType);
  
  const uvColor = isDark ? uvInfo.colorDark : uvInfo.color;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
        <View style={[styles.uvBadge, { backgroundColor: uvColor }]}>
          <Text style={styles.uvBadgeText}>{uvIndex.toFixed(1)}</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={[styles.compactLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            UV指数
          </Text>
          <Text style={[styles.compactLevel, { color: uvColor }]}>
            {uvInfo.labelJa}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <View style={styles.uvDisplay}>
          <Text style={[styles.uvValue, { color: uvColor }]}>
            {uvIndex.toFixed(1)}
          </Text>
          <Text style={[styles.uvLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            UV指数
          </Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: uvColor }]}>
          <Text style={styles.levelText}>{uvInfo.labelJa}</Text>
          <Text style={styles.levelSubtext}>{uvInfo.label}</Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
      
      <View style={styles.infoSection}>
        <Text style={[styles.description, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {uvInfo.description}
        </Text>
        <Text style={[styles.recommendation, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          {uvInfo.recommendation}
        </Text>
      </View>
      
      <View style={[styles.safeTimeSection, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
        <Text style={[styles.safeTimeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          安全な屋外活動時間
        </Text>
        <Text style={[styles.safeTimeValue, { color: uvColor }]}>
          {safeTime >= 999 ? '制限なし' : `約${safeTime}分`}
        </Text>
        <Text style={[styles.safeTimeNote, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          ※肌タイプ{skinType}の場合
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uvBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uvBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  compactInfo: {
    marginLeft: 12,
  },
  compactLabel: {
    fontSize: 12,
  },
  compactLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uvDisplay: {
    alignItems: 'flex-start',
  },
  uvValue: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  uvLabel: {
    fontSize: 14,
    marginTop: -4,
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  levelSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 22,
  },
  recommendation: {
    fontSize: 13,
    lineHeight: 20,
  },
  safeTimeSection: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  safeTimeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  safeTimeValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  safeTimeNote: {
    fontSize: 11,
    marginTop: 4,
  },
});
