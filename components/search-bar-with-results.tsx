/**
 * バックエンドAPIと統合した検索バーコンポーネント
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SearchBar } from './search-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trpc } from '@/lib/trpc';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface SearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
  importance?: number;
}

interface SearchBarWithResultsProps {
  onSelectLocation: (result: SearchResult) => void;
  onClose?: () => void;
}

export function SearchBarWithResults({
  onSelectLocation,
  onClose,
}: SearchBarWithResultsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // tRPC query for address search
  const { data: searchResults, isLoading, refetch } = trpc.search.address.useQuery(
    { query: searchQuery, limit: 10 },
    {
      enabled: searchQuery.length >= 2, // Only search if query is at least 2 characters
      refetchOnWindowFocus: false,
    }
  );

  const handleChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    setShowResults(text.length >= 2);
  }, []);

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSearchQuery('');
    setShowResults(false);
    onSelectLocation(result);
  }, [onSelectLocation]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setShowResults(false);
  }, []);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setShowResults(false);
    onClose?.();
  }, [onClose]);

  const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => {
    const getTypeIcon = (type?: string) => {
      switch (type) {
        case 'station':
        case 'railway':
          return 'train';
        case 'building':
        case 'office':
          return 'business';
        case 'park':
          return 'park';
        case 'restaurant':
          return 'restaurant';
        case 'shop':
          return 'store';
        default:
          return 'place';
      }
    };

    return (
      <Pressable
        onPress={() => handleSelectResult(item)}
        style={({ pressed }) => [
          styles.resultItem,
          {
            backgroundColor: pressed
              ? isDark
                ? '#1E293B'
                : '#F1F5F9'
              : isDark
              ? '#0F172A'
              : '#FFFFFF',
          },
        ]}
      >
        <View style={styles.resultIconContainer}>
          <MaterialIcons
            name={getTypeIcon(item.type)}
            size={24}
            color={isDark ? '#94A3B8' : '#64748B'}
          />
        </View>
        <View style={styles.resultTextContainer}>
          <Text
            style={[
              styles.resultName,
              { color: isDark ? '#F8FAFC' : '#0F172A' },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.resultAddress,
              { color: isDark ? '#64748B' : '#94A3B8' },
            ]}
            numberOfLines={1}
          >
            {item.address}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      </Pressable>
    );
  }, [isDark, handleSelectResult]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleChangeText}
          onClear={handleClear}
          placeholder="場所を検索（例: 東京駅、渋谷）"
          autoFocus
        />
        {onClose && (
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                styles.closeButtonText,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              キャンセル
            </Text>
          </Pressable>
        )}
      </View>

      {showResults && (
        <View
          style={[
            styles.resultsContainer,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={isDark ? '#6366F1' : '#4F46E5'} />
              <Text
                style={[
                  styles.loadingText,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                検索中...
              </Text>
            </View>
          ) : searchResults && searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <MaterialIcons
                name="search-off"
                size={48}
                color={isDark ? '#475569' : '#CBD5E1'}
              />
              <Text
                style={[
                  styles.noResultsText,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                {searchQuery.length >= 2
                  ? '検索結果が見つかりませんでした'
                  : '2文字以上入力してください'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeButton: {
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultIconContainer: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
