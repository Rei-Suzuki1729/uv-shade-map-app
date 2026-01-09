/**
 * ルート検索画面
 * 日陰優先のルート検索と比較
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ScreenContainer } from '@/components/screen-container';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocation } from '@/hooks/use-location';
import { RouteSearchForm } from '@/components/route/RouteSearchForm';
import { RouteResultList } from '@/components/route/RouteResultList';
import { useRouteSearch } from '@/hooks/route/useRouteSearch';

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { location } = useLocation();

  const {
    destination,
    setDestination,
    isSearching,
    routes,
    selectedRoute,
    error,
    searchRoutes,
    selectRoute,
    startNavigation,
  } = useRouteSearch(location);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              ルート検索
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              日陰を優先したルートを検索
            </Text>
          </View>

          {/* 検索フォーム */}
          <RouteSearchForm
            destination={destination}
            onDestinationChange={setDestination}
            onSubmit={searchRoutes}
            isDark={isDark}
          />

          {/* 検索ボタン */}
          <Pressable
            onPress={searchRoutes}
            disabled={!destination.trim() || isSearching}
            style={({ pressed }) => [
              styles.searchButton,
              {
                backgroundColor: destination.trim() ? '#6366F1' : (isDark ? '#334155' : '#E2E8F0'),
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {isSearching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="search" size={20} color={destination.trim() ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')} />
                <Text style={[
                  styles.searchButtonText,
                  { color: destination.trim() ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8') }
                ]}>
                  ルートを検索
                </Text>
              </>
            )}
          </Pressable>

          {/* エラー表示 */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <MaterialIcons name="error-outline" size={20} color="#EF4444" />
              <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                {error}
              </Text>
            </View>
          )}

          {/* ルート結果 */}
          <RouteResultList
            routes={routes}
            selectedRouteId={selectedRoute}
            onSelectRoute={selectRoute}
            onStartNavigation={startNavigation}
            isDark={isDark}
          />

          {/* 説明（初期状態） */}
          {routes.length === 0 && !isSearching && (
            <View style={styles.infoSection}>
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                <MaterialIcons name="wb-shade" size={32} color="#6366F1" />
                <Text style={[styles.infoTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  日陰優先ルート
                </Text>
                <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  建物や木々の影を活用し、紫外線への露出を最小化するルートを提案します。
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
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
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
