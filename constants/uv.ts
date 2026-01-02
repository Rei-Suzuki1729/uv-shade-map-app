/**
 * UV指数に関する定数とヘルパー関数
 * 世界保健機関(WHO)のUV指数ガイドラインに基づく
 */

export type UVLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';

export interface UVInfo {
  level: UVLevel;
  label: string;
  labelJa: string;
  description: string;
  recommendation: string;
  color: string;
  colorDark: string;
}

/**
 * UV指数レベルの定義
 * WHO Global Solar UV Index: A Practical Guide に基づく
 */
export const UV_LEVELS: Record<UVLevel, UVInfo> = {
  low: {
    level: 'low',
    label: 'Low',
    labelJa: '低',
    description: '肌へのダメージリスクは最小限です',
    recommendation: '特別な対策は不要ですが、敏感肌の方は日焼け止めを推奨',
    color: '#22C55E',
    colorDark: '#4ADE80',
  },
  moderate: {
    level: 'moderate',
    label: 'Moderate',
    labelJa: '中程度',
    description: '30分以上の屋外活動で日焼けの可能性があります',
    recommendation: '日焼け止め(SPF30+)、帽子、サングラスを推奨',
    color: '#EAB308',
    colorDark: '#FACC15',
  },
  high: {
    level: 'high',
    label: 'High',
    labelJa: '高',
    description: '短時間でも日焼けする可能性があります',
    recommendation: '日焼け止め(SPF30+)必須、日陰を活用、10-16時の外出を控える',
    color: '#F97316',
    colorDark: '#FB923C',
  },
  veryHigh: {
    level: 'veryHigh',
    label: 'Very High',
    labelJa: '非常に高',
    description: '数分で肌にダメージを受ける可能性があります',
    recommendation: '屋外活動を最小限に、日陰を優先、完全な日焼け対策必須',
    color: '#EF4444',
    colorDark: '#F87171',
  },
  extreme: {
    level: 'extreme',
    label: 'Extreme',
    labelJa: '極端',
    description: '非常に短時間で深刻な日焼けを起こす可能性があります',
    recommendation: '屋外活動を避ける、必要な場合は完全防護で日陰のみ移動',
    color: '#A855F7',
    colorDark: '#C084FC',
  },
};

/**
 * UV指数からレベルを判定
 * @param uvIndex UV指数 (0-11+)
 * @returns UVレベル情報
 */
export function getUVLevel(uvIndex: number): UVInfo {
  if (uvIndex < 3) return UV_LEVELS.low;
  if (uvIndex < 6) return UV_LEVELS.moderate;
  if (uvIndex < 8) return UV_LEVELS.high;
  if (uvIndex < 11) return UV_LEVELS.veryHigh;
  return UV_LEVELS.extreme;
}

/**
 * UV指数に基づく安全な屋外活動時間を計算
 * フィッツパトリック肌タイプに基づく
 * @param uvIndex UV指数
 * @param skinType 肌タイプ (1-6)
 * @returns 安全な屋外活動時間（分）
 */
export function getSafeExposureTime(uvIndex: number, skinType: number): number {
  // 各肌タイプのMED (Minimal Erythema Dose) 基準値 (mJ/cm²)
  const medValues: Record<number, number> = {
    1: 200,  // Type I: 非常に色白、常に日焼け
    2: 250,  // Type II: 色白、日焼けしやすい
    3: 300,  // Type III: 中程度、時々日焼け
    4: 450,  // Type IV: オリーブ色、ほとんど日焼けしない
    5: 600,  // Type V: 褐色、日焼けしにくい
    6: 900,  // Type VI: 濃い褐色、日焼けしない
  };

  const med = medValues[skinType] || medValues[3];
  // UV指数1 = 25 mW/m² = 0.0025 mJ/cm²/s
  const uvIntensity = uvIndex * 0.0025;
  
  if (uvIntensity === 0) return 999; // 無限大
  
  const safeTimeSeconds = med / uvIntensity;
  const safeTimeMinutes = Math.floor(safeTimeSeconds / 60);
  
  return Math.min(safeTimeMinutes, 999);
}

/**
 * 肌タイプの定義（フィッツパトリック分類）
 */
export const SKIN_TYPES = [
  { id: 1, name: 'タイプI', description: '非常に色白、そばかすが多い、常に日焼け' },
  { id: 2, name: 'タイプII', description: '色白、日焼けしやすく、少し黒くなる' },
  { id: 3, name: 'タイプIII', description: '中程度の肌色、時々日焼け、均一に黒くなる' },
  { id: 4, name: 'タイプIV', description: 'オリーブ色、ほとんど日焼けしない' },
  { id: 5, name: 'タイプV', description: '褐色、日焼けしにくい' },
  { id: 6, name: 'タイプVI', description: '濃い褐色〜黒、日焼けしない' },
];

/**
 * UV指数から色を取得
 */
export function getUVColor(uvIndex: number): string {
  const level = getUVLevel(uvIndex);
  return level.color;
}

/**
 * UV指数に基づく推奨事項を取得
 */
export function getUVRecommendation(uvIndex: number): string {
  const level = getUVLevel(uvIndex);
  return level.recommendation;
}
