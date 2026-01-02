/**
 * プラットフォーム別デザイン定数
 * iOS: Apple Human Interface Guidelines
 * Android: Material Design 3
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

/**
 * 角丸の定数
 */
export const BorderRadius = {
  // iOS: より大きな角丸
  // Android: Material Design 3の角丸
  xs: isIOS ? 6 : 4,
  sm: isIOS ? 10 : 8,
  md: isIOS ? 14 : 12,
  lg: isIOS ? 20 : 16,
  xl: isIOS ? 28 : 24,
  full: 9999,
  
  // コンポーネント別
  card: isIOS ? 16 : 12,
  button: isIOS ? 12 : 20, // Androidはより丸い
  sheet: isIOS ? 24 : 28,
  searchBar: isIOS ? 12 : 28, // Android Material検索バー
};

/**
 * シャドウの定数
 */
export const Shadows = {
  // iOS: よりソフトなシャドウ
  // Android: エレベーション
  sm: isIOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      }
    : {
        elevation: 2,
      },
  md: isIOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      }
    : {
        elevation: 4,
      },
  lg: isIOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      }
    : {
        elevation: 8,
      },
  xl: isIOS
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      }
    : {
        elevation: 16,
      },
};

/**
 * スペーシングの定数
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // セーフエリア
  screenPadding: isIOS ? 16 : 16,
  cardPadding: isIOS ? 16 : 16,
  listItemPadding: isIOS ? 16 : 16,
};

/**
 * タイポグラフィの定数
 */
export const Typography = {
  // iOS: SF Pro
  // Android: Roboto (デフォルト)
  largeTitle: {
    fontSize: isIOS ? 34 : 32,
    fontWeight: '700' as const,
    lineHeight: isIOS ? 41 : 40,
    letterSpacing: isIOS ? 0.37 : 0,
  },
  title1: {
    fontSize: isIOS ? 28 : 24,
    fontWeight: '700' as const,
    lineHeight: isIOS ? 34 : 32,
    letterSpacing: isIOS ? 0.36 : 0,
  },
  title2: {
    fontSize: isIOS ? 22 : 20,
    fontWeight: '700' as const,
    lineHeight: isIOS ? 28 : 28,
    letterSpacing: isIOS ? 0.35 : 0.15,
  },
  title3: {
    fontSize: isIOS ? 20 : 18,
    fontWeight: '600' as const,
    lineHeight: isIOS ? 25 : 24,
    letterSpacing: isIOS ? 0.38 : 0.15,
  },
  headline: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: '600' as const,
    lineHeight: isIOS ? 22 : 24,
    letterSpacing: isIOS ? -0.41 : 0.15,
  },
  body: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 22 : 24,
    letterSpacing: isIOS ? -0.41 : 0.5,
  },
  callout: {
    fontSize: isIOS ? 16 : 14,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 21 : 20,
    letterSpacing: isIOS ? -0.32 : 0.25,
  },
  subhead: {
    fontSize: isIOS ? 15 : 14,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 20 : 20,
    letterSpacing: isIOS ? -0.24 : 0.1,
  },
  footnote: {
    fontSize: isIOS ? 13 : 12,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 18 : 16,
    letterSpacing: isIOS ? -0.08 : 0.4,
  },
  caption1: {
    fontSize: isIOS ? 12 : 12,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 16 : 16,
    letterSpacing: isIOS ? 0 : 0.4,
  },
  caption2: {
    fontSize: isIOS ? 11 : 11,
    fontWeight: '400' as const,
    lineHeight: isIOS ? 13 : 16,
    letterSpacing: isIOS ? 0.07 : 0.5,
  },
};

/**
 * アニメーションの定数
 */
export const Animation = {
  // iOS: スプリングアニメーション
  // Android: イージング
  duration: {
    fast: isIOS ? 200 : 150,
    normal: isIOS ? 300 : 250,
    slow: isIOS ? 500 : 400,
  },
  spring: {
    damping: isIOS ? 15 : 20,
    stiffness: isIOS ? 150 : 200,
    mass: 1,
  },
};

/**
 * ボトムシートのスナップポイント
 */
export const BottomSheetSnapPoints = {
  // iOS: Apple Maps風
  // Android: Material Design風
  collapsed: isIOS ? '15%' : '12%',
  half: isIOS ? '45%' : '50%',
  expanded: isIOS ? '85%' : '90%',
};

/**
 * タブバーの高さ
 */
export const TabBarHeight = {
  base: isIOS ? 49 : 56,
  withLabel: isIOS ? 49 : 80,
};

/**
 * ナビゲーションバーの高さ
 */
export const NavBarHeight = {
  standard: isIOS ? 44 : 56,
  large: isIOS ? 96 : 56, // iOSのLarge Title
};

/**
 * 画面サイズ
 */
export const Screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414,
};

/**
 * タッチターゲットの最小サイズ
 */
export const TouchTarget = {
  min: isIOS ? 44 : 48,
  recommended: isIOS ? 44 : 56,
};
