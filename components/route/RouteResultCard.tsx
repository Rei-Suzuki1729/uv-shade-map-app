import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type RouteAnalysis } from '@/lib/shade-route-analyzer';
import { formatDistance, formatDuration } from '@/lib/route-service';

interface RouteResultCardProps {
  routeAnalysis: RouteAnalysis;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
  index: number;
}

export function RouteResultCard({
  routeAnalysis,
  isSelected,
  onSelect,
  isDark,
  index,
}: RouteResultCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.routeCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isSelected ? '#6366F1' : (isDark ? '#334155' : '#E2E8F0'),
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.routeHeader}>
        <View style={styles.routeNameRow}>
          <Text style={[styles.routeName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            日陰優先ルート
          </Text>
          {routeAnalysis.isRecommended && (
            <View style={styles.recommendedBadge}>
              <MaterialIcons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.recommendedText}>推奨</Text>
            </View>
          )}
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#6366F1" />
        )}
      </View>

      <View style={styles.routeDetails}>
        <View style={styles.routeDetailItem}>
          <MaterialIcons name="schedule" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={[styles.routeDetailText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {formatDuration(routeAnalysis.route.duration)}
          </Text>
        </View>
        <View style={styles.routeDetailItem}>
          <MaterialIcons name="straighten" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={[styles.routeDetailText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {formatDistance(routeAnalysis.route.distance)}
          </Text>
        </View>
      </View>

      <View style={styles.routeStats}>
        <View style={styles.routeStat}>
          <Text style={[styles.routeStatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            日陰率
          </Text>
          <Text style={[styles.routeStatValue, { color: '#22C55E' }]}>
            {routeAnalysis.shadePercentage}%
          </Text>
          <View style={[styles.statBar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statBarFill, { width: `${routeAnalysis.shadePercentage}%`, backgroundColor: '#22C55E' }]} />
          </View>
        </View>
        <View style={styles.routeStat}>
          <Text style={[styles.routeStatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            UV露出
          </Text>
          <Text style={[styles.routeStatValue, { color: '#EF4444' }]}>
            {routeAnalysis.uvExposure}%
          </Text>
          <View style={[styles.statBar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statBarFill, { width: `${routeAnalysis.uvExposure}%`, backgroundColor: '#EF4444' }]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 17,
    fontWeight: '600',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  routeDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDetailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  routeStat: {
    flex: 1,
  },
  routeStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
