/**
 * Apple Maps風検索バーコンポーネント
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = '場所を検索',
  value = '',
  onChangeText,
  onSubmit,
  onFocus,
  onClear,
  autoFocus = false,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    onChangeText?.(text);
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalValue('');
    onChangeText?.('');
    onClear?.();
  };

  const handleSubmit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSubmit?.(localValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isFocused
            ? '#6366F1'
            : isDark
            ? '#334155'
            : '#E2E8F0',
        },
      ]}
    >
      <MaterialIcons
        name="search"
        size={22}
        color={isDark ? '#94A3B8' : '#64748B'}
        style={styles.searchIcon}
      />
      <TextInput
        style={[
          styles.input,
          { color: isDark ? '#F8FAFC' : '#0F172A' },
        ]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        value={localValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 && (
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.clearIcon,
              { backgroundColor: isDark ? '#64748B' : '#94A3B8' },
            ]}
          >
            <MaterialIcons name="close" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
