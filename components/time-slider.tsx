/**
 * 時間スライダーコンポーネント
 * 日陰の時間変化をシミュレーション
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TimeSliderProps {
  currentTime: Date;
  onTimeChange: (time: Date) => void;
  sunrise?: Date;
  sunset?: Date;
}

export function TimeSlider({
  currentTime,
  onTimeChange,
  sunrise,
  sunset,
}: TimeSliderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isPlaying, setIsPlaying] = useState(false);

  // デフォルトの日の出・日の入り（東京の平均的な値）
  const defaultSunrise = new Date(currentTime);
  defaultSunrise.setHours(5, 30, 0, 0);
  const defaultSunset = new Date(currentTime);
  defaultSunset.setHours(18, 30, 0, 0);

  const sunriseTime = sunrise || defaultSunrise;
  const sunsetTime = sunset || defaultSunset;

  // 分単位でのスライダー値
  const startMinutes = sunriseTime.getHours() * 60 + sunriseTime.getMinutes();
  const endMinutes = sunsetTime.getHours() * 60 + sunsetTime.getMinutes();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // スライダー値を時刻に変換
  const minutesToTime = useCallback((minutes: number): Date => {
    const time = new Date(currentTime);
    time.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return time;
  }, [currentTime]);

  // 時刻をフォーマット
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // スライダー変更時
  const handleSliderChange = useCallback((value: number) => {
    const newTime = minutesToTime(Math.round(value));
    onTimeChange(newTime);
  }, [minutesToTime, onTimeChange]);

  // 現在時刻にリセット
  const resetToNow = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTimeChange(new Date());
  }, [onTimeChange]);

  // 再生/一時停止
  const togglePlay = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // アニメーション処理
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying) {
      intervalId = setInterval(() => {
        const nextTime = new Date(currentTime);
        // 50msごとに2分進める（1秒で40分進む）
        nextTime.setMinutes(currentTime.getMinutes() + 2);

        // 日没を超えたら停止
        const nextMinutes = nextTime.getHours() * 60 + nextTime.getMinutes();
        if (nextMinutes >= endMinutes) {
          setIsPlaying(false);
          // 日没ちょうどに合わせる
          const sunset = new Date(currentTime);
          sunset.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
          onTimeChange(sunset);
        } else {
          onTimeChange(nextTime);
        }
      }, 50);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, currentTime, endMinutes, onTimeChange]);

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? '#1E293BEE' : '#FFFFFFEE' }
    ]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          時間シミュレーション
        </Text>
        <Pressable
          onPress={resetToNow}
          style={({ pressed }) => [
            styles.resetButton,
            { opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <Text style={styles.resetButtonText}>現在時刻</Text>
        </Pressable>
      </View>

      {/* 現在の時刻表示 */}
      <View style={styles.timeDisplay}>
        <MaterialIcons
          name="schedule"
          size={24}
          color="#6366F1"
        />
        <Text style={[styles.currentTime, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {formatTime(currentTime)}
        </Text>
      </View>

      {/* スライダー */}
      <View style={styles.sliderContainer}>
        <Text style={[styles.timeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          {formatTime(sunriseTime)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={startMinutes}
          maximumValue={endMinutes}
          value={Math.max(startMinutes, Math.min(endMinutes, currentMinutes))}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#6366F1"
          maximumTrackTintColor={isDark ? '#334155' : '#E2E8F0'}
          thumbTintColor="#6366F1"
        />
        <Text style={[styles.timeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          {formatTime(sunsetTime)}
        </Text>
      </View>

      {/* コントロールボタン */}
      <View style={styles.controls}>
        <Pressable
          onPress={() => {
            const newMinutes = Math.max(startMinutes, currentMinutes - 30);
            handleSliderChange(newMinutes);
          }}
          style={({ pressed }) => [
            styles.controlButton,
            { backgroundColor: isDark ? '#334155' : '#F1F5F9', opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <MaterialIcons name="fast-rewind" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </Pressable>
        
        <Pressable
          onPress={togglePlay}
          testID="play-button"
          style={({ pressed }) => [
            styles.playButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={28}
            color="#FFFFFF"
          />
        </Pressable>
        
        <Pressable
          onPress={() => {
            const newMinutes = Math.min(endMinutes, currentMinutes + 30);
            handleSliderChange(newMinutes);
          }}
          style={({ pressed }) => [
            styles.controlButton,
            { backgroundColor: isDark ? '#334155' : '#F1F5F9', opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <MaterialIcons name="fast-forward" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </Pressable>
      </View>

      {/* 説明テキスト */}
      <Text style={[styles.description, { color: isDark ? '#64748B' : '#94A3B8' }]}>
        スライダーを動かして、時間帯による影の変化を確認できます
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  currentTime: {
    fontSize: 32,
    fontWeight: '700',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
