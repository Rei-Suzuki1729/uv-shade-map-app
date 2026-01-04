/**
 * 科学的根拠に基づいたUV計算ライブラリ
 * 
 * 参考文献:
 * 1. Sánchez-Pérez et al. (2019) "Relationship between ultraviolet index (UVI) 
 *    and first-, second- and third-degree sunburn using the Probit methodology"
 *    Scientific Reports 9, Article number: 733
 * 
 * 2. WHO Global Solar UV Index: A Practical Guide (2002)
 * 
 * 3. DIN-5050 規格（肌タイプ別UV露出時間）
 */

import { SkinType } from '@/constants/uv';

/**
 * UV指数からUV放射強度を計算
 * 式: I_UV = 15.1 × UVI + 35.5 (W/m²)
 * 出典: Sánchez-Pérez et al. (2019), 式(4)
 */
export function calculateUVIntensity(uvIndex: number): number {
  return 15.1 * uvIndex + 35.5;
}

/**
 * UV放射線量を計算
 * 式: D = I^(4/3) × t_e
 * 出典: Sánchez-Pérez et al. (2019), 式(3)
 * 
 * @param uvIndex UV指数
 * @param exposureTimeSeconds 露出時間（秒）
 * @returns UV放射線量 ((W/m²)^(4/3) × s)
 */
export function calculateUVDose(
  uvIndex: number,
  exposureTimeSeconds: number
): number {
  const intensity = calculateUVIntensity(uvIndex);
  return Math.pow(intensity, 4 / 3) * exposureTimeSeconds;
}

/**
 * 肌タイプ別の1度日焼け発生線量閾値
 * 出典: Sánchez-Pérez et al. (2019), Table 4
 * 単位: (kW/m²)^(4/3) × s
 */
const FIRST_DEGREE_BURN_THRESHOLD: Record<SkinType, number> = {
  I: 90,
  II: 115,
  III: 150,
  IV: 200,
  V: 300,
  VI: 400,
};

/**
 * DIN-5050規格に基づく肌タイプ別の基準露出時間（UVI=1での分数）
 * 出典: DIN-5050, Figure 1 in Sánchez-Pérez et al. (2019)
 */
const BASE_EXPOSURE_TIME_MINUTES: Record<SkinType, number> = {
  I: 67,
  II: 100,
  III: 200,
  IV: 300,
  V: 400,
  VI: 500,
};

/**
 * 安全露出時間を計算（DIN-5050規格準拠）
 * 
 * @param uvIndex UV指数
 * @param skinType 肌タイプ（I-VI）
 * @returns 安全露出時間（分）
 */
export function calculateSafeExposureTime(
  uvIndex: number,
  skinType: SkinType
): number {
  if (uvIndex <= 0) return Infinity;
  
  const baseTime = BASE_EXPOSURE_TIME_MINUTES[skinType];
  const safeTime = baseTime / uvIndex;
  
  return Math.round(safeTime);
}

/**
 * 現在の露出が安全かどうかを判定
 * 
 * @param uvIndex UV指数
 * @param skinType 肌タイプ
 * @param exposureTimeMinutes 露出時間（分）
 * @returns 安全性の判定結果
 */
export function evaluateExposureSafety(
  uvIndex: number,
  skinType: SkinType,
  exposureTimeMinutes: number
): {
  isSafe: boolean;
  safeTimeRemaining: number;
  burnRisk: 'none' | 'low' | 'moderate' | 'high' | 'very_high';
  recommendation: string;
} {
  const safeTime = calculateSafeExposureTime(uvIndex, skinType);
  const timeRemaining = safeTime - exposureTimeMinutes;
  const exposureRatio = exposureTimeMinutes / safeTime;
  
  let burnRisk: 'none' | 'low' | 'moderate' | 'high' | 'very_high';
  let recommendation: string;
  
  if (exposureRatio < 0.5) {
    burnRisk = 'none';
    recommendation = '現在の露出レベルは安全です。';
  } else if (exposureRatio < 0.75) {
    burnRisk = 'low';
    recommendation = '日焼け止めの塗り直しを検討してください。';
  } else if (exposureRatio < 1.0) {
    burnRisk = 'moderate';
    recommendation = '日陰に移動するか、日焼け止めを塗り直してください。';
  } else if (exposureRatio < 1.5) {
    burnRisk = 'high';
    recommendation = '直ちに日陰に移動してください。軽度の日焼けのリスクがあります。';
  } else {
    burnRisk = 'very_high';
    recommendation = '屋内に移動してください。日焼けのリスクが非常に高いです。';
  }
  
  return {
    isSafe: exposureRatio < 1.0,
    safeTimeRemaining: Math.max(0, timeRemaining),
    burnRisk,
    recommendation,
  };
}

/**
 * UV指数レベルの分類（WHO準拠）
 * 出典: WHO Global Solar UV Index: A Practical Guide (2002)
 */
export type UVLevel = 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';

export function classifyUVLevel(uvIndex: number): UVLevel {
  if (uvIndex <= 2) return 'low';
  if (uvIndex <= 5) return 'moderate';
  if (uvIndex <= 7) return 'high';
  if (uvIndex <= 10) return 'very_high';
  return 'extreme';
}

/**
 * UV指数レベルに応じた推奨事項（WHO準拠）
 */
export function getUVRecommendations(uvIndex: number): {
  level: UVLevel;
  protection: string[];
  outdoorAdvice: string;
} {
  const level = classifyUVLevel(uvIndex);
  
  switch (level) {
    case 'low':
      return {
        level,
        protection: ['特別な対策は不要'],
        outdoorAdvice: '安全に屋外活動を楽しめます。',
      };
    case 'moderate':
      return {
        level,
        protection: [
          '日焼け止め（SPF30+）を使用',
          '帽子とサングラスを着用',
        ],
        outdoorAdvice: '正午前後は日陰を活用してください。',
      };
    case 'high':
      return {
        level,
        protection: [
          '日焼け止め（SPF30+）を使用',
          '帽子、サングラス、長袖を着用',
          '日陰を積極的に活用',
        ],
        outdoorAdvice: '10時〜14時の屋外活動を控えめに。',
      };
    case 'very_high':
      return {
        level,
        protection: [
          '日焼け止め（SPF50+）を使用',
          '帽子、サングラス、長袖を必ず着用',
          '日陰を最大限に活用',
        ],
        outdoorAdvice: '10時〜16時の屋外活動を最小限に。',
      };
    case 'extreme':
      return {
        level,
        protection: [
          '日焼け止め（SPF50+）を頻繁に塗り直し',
          '完全な日よけ対策を実施',
          '可能な限り屋内に滞在',
        ],
        outdoorAdvice: '屋外活動を避けてください。',
      };
  }
}

/**
 * 日陰による UV 軽減効果を計算
 * 研究によると、建物の日陰は UV 放射を 50-95% 軽減
 * 出典: Various studies on urban shade and UV reduction
 */
export function calculateShadeUVReduction(
  shadeType: 'building' | 'tree' | 'awning' | 'umbrella'
): number {
  const reductionFactors: Record<string, number> = {
    building: 0.85,  // 85% 軽減
    tree: 0.50,      // 50% 軽減（葉の密度による）
    awning: 0.70,    // 70% 軽減
    umbrella: 0.60,  // 60% 軽減
  };
  
  return reductionFactors[shadeType] || 0.5;
}

/**
 * 日陰を考慮した実効UV指数を計算
 */
export function calculateEffectiveUVIndex(
  uvIndex: number,
  shadeRatio: number,  // 0-1: 日陰の割合
  shadeType: 'building' | 'tree' | 'awning' | 'umbrella' = 'building'
): number {
  const reduction = calculateShadeUVReduction(shadeType);
  const shadedUV = uvIndex * (1 - reduction);
  const unshadedUV = uvIndex;
  
  // 加重平均で実効UV指数を計算
  const effectiveUV = shadeRatio * shadedUV + (1 - shadeRatio) * unshadedUV;
  
  return Math.round(effectiveUV * 10) / 10;
}
