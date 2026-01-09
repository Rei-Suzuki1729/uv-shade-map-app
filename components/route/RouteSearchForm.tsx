import React from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface RouteSearchFormProps {
  destination: string;
  onDestinationChange: (text: string) => void;
  onSubmit: () => void;
  isDark: boolean;
}

export function RouteSearchForm({
  destination,
  onDestinationChange,
  onSubmit,
  isDark,
}: RouteSearchFormProps) {
  return (
    <View style={[styles.searchForm, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
      <View style={styles.inputRow}>
        <View style={[styles.inputIcon, { backgroundColor: '#22C55E20' }]}>
          <MaterialIcons name="my-location" size={18} color="#22C55E" />
        </View>
        <View style={styles.inputContent}>
          <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            出発地
          </Text>
          <Text style={[styles.inputValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            現在地
          </Text>
        </View>
      </View>

      <View style={[styles.inputDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

      <View style={styles.inputRow}>
        <View style={[styles.inputIcon, { backgroundColor: '#EF444420' }]}>
          <MaterialIcons name="place" size={18} color="#EF4444" />
        </View>
        <View style={styles.inputContent}>
          <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            目的地
          </Text>
          <TextInput
            style={[styles.textInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
            placeholder="目的地を入力"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={destination}
            onChangeText={onDestinationChange}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchForm: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
});
