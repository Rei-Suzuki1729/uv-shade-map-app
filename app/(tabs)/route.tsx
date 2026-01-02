/**
 * ルート検索画面
 * 日陰優先のルート検索と比較
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocation } from '@/hooks/use-location';

interface RouteOption {
  id: string;
  name: string;
  duration: number; // 分
  distance: number; // メートル
  shadePercentage: number;
  uvExposure: number; // 相対値 0-100
  isRecommended: boolean;
}

// サンプルルートデータ
const generateSampleRoutes = (distance: number): RouteOption[] => [
  {
    id: 'shade-priority',
    name: '日陰優先ルート',
    duration: Math.round(distance / 60), // 時速3.6km想定
    distance: Math.round(distance * 1.15), // 15%長め
    shadePercentage: 78,
    uvExposure: 22,
    isRecommended: true,
  },
  {
    id: 'balanced',
    name: 'バランスルート',
    duration: Math.round(distance / 70),
    distance: Math.round(distance * 1.05),
    shadePercentage: 52,
    uvExposure: 48,
    isRecommended: false,
  },
  {
    id: 'fastest',
    name: '最短ルート',
    duration: Math.round(distance / 80),
    distance: distance,
    shadePercentage: 31,
    uvExposure: 69,
    isRecommended: false,
  },
];

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { location } = useLocation();

  // 状態
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // ルート検索
  const searchRoutes = useCallback(async () => {
    if (!destination.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSearching(true);
    setRoutes([]);
    setSelectedRoute(null);

    // シミュレーション：実際にはAPIを呼び出す
    await new Promise(resolve => setTimeout(resolve, 1500));

    // サンプルデータを生成（距離は500m〜2kmのランダム）
    const baseDistance = 500 + Math.random() * 1500;
    const generatedRoutes = generateSampleRoutes(baseDistance);
    
    setRoutes(generatedRoutes);
    setSelectedRoute(generatedRoutes[0].id);
    setIsSearching(false);
  }, [destination]);

  // ルート選択
  const selectRoute = useCallback((routeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedRoute(routeId);
  }, []);

  // ナビゲーション開始
  const startNavigation = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // TODO: ナビゲーション画面に遷移
    console.log('Start navigation with route:', selectedRoute);
  }, [selectedRoute]);

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
          <View style={[styles.searchForm, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            {/* 出発地 */}
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

            {/* 目的地 */}
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
                  onChangeText={setDestination}
                  onSubmitEditing={searchRoutes}
                  returnKeyType="search"
                />
              </View>
            </View>
          </View>

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

          {/* ルート結果 */}
          {routes.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                ルート候補
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                UV露出を最小化するルートを推奨しています
              </Text>

              {routes.map((route) => (
                <Pressable
                  key={route.id}
                  onPress={() => selectRoute(route.id)}
                  style={({ pressed }) => [
                    styles.routeCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: selectedRoute === route.id ? '#6366F1' : (isDark ? '#334155' : '#E2E8F0'),
                      borderWidth: selectedRoute === route.id ? 2 : 1,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {/* ルート名とバッジ */}
                  <View style={styles.routeHeader}>
                    <View style={styles.routeNameRow}>
                      <Text style={[styles.routeName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {route.name}
                      </Text>
                      {route.isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <MaterialIcons name="star" size={12} color="#FFFFFF" />
                          <Text style={styles.recommendedText}>推奨</Text>
                        </View>
                      )}
                    </View>
                    {selectedRoute === route.id && (
                      <MaterialIcons name="check-circle" size={24} color="#6366F1" />
                    )}
                  </View>

                  {/* ルート詳細 */}
                  <View style={styles.routeDetails}>
                    <View style={styles.routeDetailItem}>
                      <MaterialIcons name="schedule" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={[styles.routeDetailText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {route.duration}分
                      </Text>
                    </View>
                    <View style={styles.routeDetailItem}>
                      <MaterialIcons name="straighten" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={[styles.routeDetailText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {route.distance}m
                      </Text>
                    </View>
                  </View>

                  {/* 日陰率とUV露出 */}
                  <View style={styles.routeStats}>
                    <View style={styles.routeStat}>
                      <View style={styles.routeStatHeader}>
                        <MaterialIcons name="wb-shade" size={14} color="#22C55E" />
                        <Text style={[styles.routeStatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          日陰率
                        </Text>
                      </View>
                      <Text style={[styles.routeStatValue, { color: '#22C55E' }]}>
                        {route.shadePercentage}%
                      </Text>
                      <View style={[styles.statBar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.statBarFill, { width: `${route.shadePercentage}%`, backgroundColor: '#22C55E' }]} />
                      </View>
                    </View>
                    <View style={styles.routeStat}>
                      <View style={styles.routeStatHeader}>
                        <MaterialIcons name="wb-sunny" size={14} color="#EF4444" />
                        <Text style={[styles.routeStatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          UV露出
                        </Text>
                      </View>
                      <Text style={[styles.routeStatValue, { color: '#EF4444' }]}>
                        {route.uvExposure}%
                      </Text>
                      <View style={[styles.statBar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.statBarFill, { width: `${route.uvExposure}%`, backgroundColor: '#EF4444' }]} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* ナビゲーション開始ボタン */}
              {selectedRoute && (
                <Pressable
                  onPress={startNavigation}
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
          )}

          {/* 説明 */}
          {routes.length === 0 && !isSearching && (
            <View style={styles.infoSection}>
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                <MaterialIcons name="info" size={24} color="#6366F1" />
                <Text style={[styles.infoTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  日陰優先ルートとは？
                </Text>
                <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  建物や木々の影を最大限に活用し、紫外線への露出を最小化するルートを提案します。
                  {'\n\n'}
                  皮膚科学研究に基づき、UV露出を抑えることで肌へのダメージを軽減できます。
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                <MaterialIcons name="science" size={24} color="#22C55E" />
                <Text style={[styles.infoTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  データソース
                </Text>
                <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  • PLATEAU 3D都市モデル（国土交通省）{'\n'}
                  • SunCalc天文学アルゴリズム{'\n'}
                  • WHO UV指数ガイドライン
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
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
  routeStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  routeStatLabel: {
    fontSize: 11,
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
  infoSection: {
    gap: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
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
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
