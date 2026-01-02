/**
 * 地図表示モード切替コンポーネント
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type MapMode = 'standard' | 'heatmap' | 'shade';

interface MapModeSelectorProps {
  currentMode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const modes: Array<{ id: MapMode; label: string; icon: string }> = [
  { id: 'standard', label: '標準', icon: '🗺️' },
  { id: 'heatmap', label: 'UV', icon: '☀️' },
  { id: 'shade', label: '日陰', icon: '🏢' },
];

export function MapModeSelector({ currentMode, onModeChange }: MapModeSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = (mode: MapMode) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onModeChange(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
      {modes.map((mode) => {
        const isActive = currentMode === mode.id;
        return (
          <Pressable
            key={mode.id}
            onPress={() => handlePress(mode.id)}
            style={({ pressed }) => [
              styles.button,
              isActive && [styles.activeButton, { backgroundColor: isDark ? '#6366F1' : '#6366F1' }],
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.icon}>{mode.icon}</Text>
            <Text
              style={[
                styles.label,
                { color: isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') },
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  activeButton: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
