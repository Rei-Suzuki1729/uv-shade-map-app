import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type RouteAnalysis } from '@/lib/shade-route-analyzer';
import { RouteResultCard } from './RouteResultCard';

interface RouteResultListProps {
  routes: RouteAnalysis[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onStartNavigation: () => void;
  isDark: boolean;
}

export function RouteResultList({
  routes,
  selectedRouteId,
  onSelectRoute,
  onStartNavigation,
  isDark,
}: RouteResultListProps) {
  if (routes.length === 0) return null;

  return (
    <View style={styles.resultsSection}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
        ルート候補
      </Text>

      {routes.map((routeAnalysis, index) => (
        <RouteResultCard
          key={`route-${index}`}
          routeAnalysis={routeAnalysis}
          isSelected={selectedRouteId === `route-${index}`}
          onSelect={() => onSelectRoute(`route-${index}`)}
          isDark={isDark}
          index={index}
        />
      ))}

      {selectedRouteId && (
        <Pressable
          onPress={onStartNavigation}
          style={({ pressed }) => [
            styles.startButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <MaterialIcons name="navigation" size={24} color="#FFFFFF" />
          <Text style={styles.startButtonText}>ナビゲーション開始</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
