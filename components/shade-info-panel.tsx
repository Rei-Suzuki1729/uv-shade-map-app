/**
 * 日陰詳細情報パネル
 * 現在地の日陰状況と推奨事項を表示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ShadeInfoPanelProps {
  isInShade: boolean;
  shadePercentage: number;
  uvReduction: number;
  nearestShadeDistance?: number; // メートル
  sunAltitude: number;
  sunAzimuth: number;
}

export function ShadeInfoPanel({
  isInShade,
  shadePercentage,
  uvReduction,
  nearestShadeDistance,
  sunAltitude,
  sunAzimuth,
}: ShadeInfoPanelProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 方位を文字列に変換
  const getAzimuthDirection = (azimuth: number): string => {
    const directions = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
    const index = Math.round(azimuth / 45) % 8;
    return directions[index];
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }
    ]}>
      {/* 日陰状態インジケーター */}
      <View style={[
        styles.statusBadge,
        { backgroundColor: isInShade ? '#22C55E20' : '#EF444420' }
      ]}>
        <MaterialIcons
          name={isInShade ? 'wb-shade' : 'wb-sunny'}
          size={24}
          color={isInShade ? '#22C55E' : '#EF4444'}
        />
        <Text style={[
          styles.statusText,
          { color: isInShade ? '#22C55E' : '#EF4444' }
        ]}>
          {isInShade ? '日陰にいます' : '日なたにいます'}
        </Text>
      </View>

      {/* 統計情報 */}
      <View style={styles.statsGrid}>
        {/* 日陰率 */}
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <MaterialIcons
              name="pie-chart"
              size={18}
              color={isDark ? '#94A3B8' : '#64748B'}
            />
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              周辺の日陰率
            </Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {shadePercentage.toFixed(0)}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${shadePercentage}%`,
                  backgroundColor: shadePercentage > 50 ? '#22C55E' : '#EAB308',
                }
              ]}
            />
          </View>
        </View>

        {/* UV削減率 */}
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <MaterialIcons
              name="shield"
              size={18}
              color={isDark ? '#94A3B8' : '#64748B'}
            />
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              UV削減率
            </Text>
          </View>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>
            {(uvReduction * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.statNote, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            日陰による保護効果
          </Text>
        </View>
      </View>

      {/* 最寄りの日陰（日なたにいる場合） */}
      {!isInShade && nearestShadeDistance !== undefined && (
        <View style={[styles.nearestShade, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          <MaterialIcons name="near-me" size={20} color="#6366F1" />
          <View style={styles.nearestShadeContent}>
            <Text style={[styles.nearestShadeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              最寄りの日陰まで
            </Text>
            <Text style={[styles.nearestShadeValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              約{nearestShadeDistance}m
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={isDark ? '#64748B' : '#94A3B8'} />
        </View>
      )}

      {/* 太陽情報 */}
      <View style={styles.sunInfo}>
        <Text style={[styles.sunInfoTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          太陽の位置
        </Text>
        <View style={styles.sunInfoRow}>
          <View style={styles.sunInfoItem}>
            <MaterialIcons name="height" size={16} color="#F59E0B" />
            <Text style={[styles.sunInfoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              高度
            </Text>
            <Text style={[styles.sunInfoValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {sunAltitude.toFixed(1)}°
            </Text>
          </View>
          <View style={[styles.sunInfoDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
          <View style={styles.sunInfoItem}>
            <MaterialIcons name="explore" size={16} color="#F59E0B" />
            <Text style={[styles.sunInfoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              方位
            </Text>
            <Text style={[styles.sunInfoValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {getAzimuthDirection(sunAzimuth)} ({sunAzimuth.toFixed(0)}°)
            </Text>
          </View>
        </View>
      </View>

      {/* 推奨事項 */}
      <View style={[
        styles.recommendation,
        { backgroundColor: isInShade ? '#22C55E10' : '#EF444410' }
      ]}>
        <MaterialIcons
          name={isInShade ? 'check-circle' : 'warning'}
          size={18}
          color={isInShade ? '#22C55E' : '#EF4444'}
        />
        <Text style={[
          styles.recommendationText,
          { color: isDark ? '#CBD5E1' : '#475569' }
        ]}>
          {isInShade
            ? '日陰にいるため、UV露出が軽減されています。長時間の屋外活動でも比較的安全です。'
            : '直射日光を浴びています。日焼け止めの使用と、こまめな日陰への移動をおすすめします。'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statNote: {
    fontSize: 11,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  nearestShade: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  nearestShadeContent: {
    flex: 1,
  },
  nearestShadeLabel: {
    fontSize: 12,
  },
  nearestShadeValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  sunInfo: {
    marginBottom: 16,
  },
  sunInfoTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  sunInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sunInfoLabel: {
    fontSize: 12,
  },
  sunInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sunInfoDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
