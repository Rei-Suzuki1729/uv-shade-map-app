/**
 * 現在地ボタンコンポーネント
 * Apple Maps風のフローティングボタン
 */

import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

interface LocationButtonProps {
  onPress: () => void;
  isTracking?: boolean;
  disabled?: boolean;
}

export function LocationButton({
  onPress,
  isTracking = false,
  disabled = false,
}: LocationButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <MaterialIcons
        name={isTracking ? 'my-location' : 'location-searching'}
        size={24}
        color={isTracking ? '#6366F1' : isDark ? '#94A3B8' : '#64748B'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
