/**
 * 設定画面
 * 肌タイプ、表示設定、通知設定など
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenContainer } from '@/components/screen-container';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SKIN_TYPES } from '@/constants/uv';
import { offlineManager, prefetchAreaData } from '@/lib/offline-cache';

const SETTINGS_KEY = 'user_settings';

interface UserSettings {
  skinType: number;
  highUVAlert: boolean;
  shadeReminder: boolean;
  defaultMapMode: 'standard' | 'shade';
  offlineMode: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  skinType: 3,
  highUVAlert: true,
  shadeReminder: true,
  defaultMapMode: 'shade',
  offlineMode: false,
};

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDark: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  value,
  onPress,
  rightElement,
  isDark,
}: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          opacity: pressed && onPress ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
        <MaterialIcons name={icon as any} size={22} color="#6366F1" />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text style={[styles.settingValue, { color: '#6366F1' }]}>
          {value}
        </Text>
      )}
      {rightElement}
      {onPress && !rightElement && (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showSkinTypeModal, setShowSkinTypeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<{
    uvDataCount: number;
    buildingDataCount: number;
    favoritesCount: number;
    totalSize: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 設定を読み込み
  useEffect(() => {
    loadSettings();
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    const stats = await offlineManager.getCacheStats();
    setCacheStats(stats);
  };

  const handleClearCache = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await offlineManager.clearAllCache();
    await loadCacheStats();
  };

  const handleDownloadAreaData = async () => {
    setIsDownloading(true);
    // 東京駅周辺のデータをダウンロード（デモ）
    await prefetchAreaData(35.6812, 139.7671, 2);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await loadCacheStats();
    setIsDownloading(false);
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  };

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  const selectSkinType = useCallback((type: number) => {
    updateSettings({ skinType: type });
    setShowSkinTypeModal(false);
  }, [updateSettings]);

  const currentSkinType = SKIN_TYPES.find(t => t.id === settings.skinType);

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            設定
          </Text>
        </View>

        {/* 肌タイプ設定 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            パーソナル設定
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <SettingItem
              icon="person"
              title="肌タイプ"
              subtitle={currentSkinType?.description}
              value={currentSkinType?.name}
              onPress={() => setShowSkinTypeModal(true)}
              isDark={isDark}
            />
          </View>
        </View>

        {/* 肌タイプ選択モーダル */}
        {showSkinTypeModal && (
          <View style={[styles.modal, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                肌タイプを選択
              </Text>
              <Pressable onPress={() => setShowSkinTypeModal(false)}>
                <MaterialIcons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
              </Pressable>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              あなたの肌タイプに合わせた紫外線対策を提案します
            </Text>
            {SKIN_TYPES.map((type) => (
              <Pressable
                key={type.id}
                onPress={() => selectSkinType(type.id)}
                style={({ pressed }) => [
                  styles.skinTypeOption,
                  {
                    backgroundColor: settings.skinType === type.id
                      ? (isDark ? '#6366F1' : '#EEF2FF')
                      : (isDark ? '#1E293B' : '#FFFFFF'),
                    borderColor: settings.skinType === type.id ? '#6366F1' : (isDark ? '#334155' : '#E2E8F0'),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[
                  styles.skinTypeName,
                  { color: settings.skinType === type.id ? (isDark ? '#FFFFFF' : '#6366F1') : (isDark ? '#F8FAFC' : '#0F172A') },
                ]}>
                  {type.name}
                </Text>
                <Text style={[
                  styles.skinTypeDesc,
                  { color: settings.skinType === type.id ? (isDark ? '#E0E7FF' : '#6366F1') : (isDark ? '#94A3B8' : '#64748B') },
                ]}>
                  {type.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 表示設定 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            表示設定
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <SettingItem
              icon="map"
              title="デフォルト表示モード"
              value={settings.defaultMapMode === 'shade' ? '日陰マップ' : '標準マップ'}
              onPress={() => updateSettings({ 
                defaultMapMode: settings.defaultMapMode === 'shade' ? 'standard' : 'shade' 
              })}
              isDark={isDark}
            />
          </View>
        </View>

        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            通知設定
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <SettingItem
              icon="wb-sunny"
              title="高UV指数アラート"
              subtitle="UV指数が高い時に通知"
              rightElement={
                <Switch
                  value={settings.highUVAlert}
                  onValueChange={(value) => updateSettings({ highUVAlert: value })}
                  trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: '#6366F1' }}
                  thumbColor="#FFFFFF"
                />
              }
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <SettingItem
              icon="wb-shade"
              title="日陰リマインダー"
              subtitle="長時間の日光露出時に通知"
              rightElement={
                <Switch
                  value={settings.shadeReminder}
                  onValueChange={(value) => updateSettings({ shadeReminder: value })}
                  trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: '#6366F1' }}
                  thumbColor="#FFFFFF"
                />
              }
              isDark={isDark}
            />
          </View>
        </View>

        {/* オフラインデータ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            オフラインデータ
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <SettingItem
              icon="cloud-download"
              title="エリアデータをダウンロード"
              subtitle="現在地周辺のデータを保存"
              onPress={handleDownloadAreaData}
              rightElement={
                isDownloading ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : undefined
              }
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <SettingItem
              icon="storage"
              title="キャッシュサイズ"
              value={cacheStats?.totalSize || '0 B'}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <SettingItem
              icon="delete"
              title="キャッシュをクリア"
              subtitle="ダウンロードしたデータを削除"
              onPress={handleClearCache}
              isDark={isDark}
            />
          </View>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            情報
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <SettingItem
              icon="info"
              title="バージョン"
              value="1.3.0"
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <SettingItem
              icon="science"
              title="科学的根拠"
              subtitle="CoolWalks論文・WHO UVガイドライン"
              isDark={isDark}
            />
          </View>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            UV Shade Map
          </Text>
          <Text style={[styles.footerSubtext, { color: isDark ? '#475569' : '#CBD5E1' }]}>
            紫外線から肌を守る、日陰優先ナビゲーション
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  modal: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  skinTypeOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  skinTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  skinTypeDesc: {
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
});
