/**
 * タイルユーティリティ
 * タイムバケット生成、タイルURL生成など
 */

import { getApiBaseUrl } from '@/constants/oauth';

/**
 * 日時からタイムバケット文字列を生成
 * 10分刻みに丸める
 *
 * @param date 日時
 * @returns タイムバケット文字列（例: "20260110_1530"）
 */
export function formatTimeBucket(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');

  // 10分刻みに丸める
  const minutes = Math.floor(date.getMinutes() / 10) * 10;
  const minutesStr = String(minutes).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutesStr}`;
}

/**
 * 日陰タイルのURLテンプレートを生成
 *
 * @param timeBucket タイムバケット（例: "20260110_1530"）
 * @returns タイルURLテンプレート
 */
export function getShadeTileUrlTemplate(timeBucket: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/tiles/shade/${timeBucket}/{z}/{x}/{y}.png`;
}

/**
 * 現在時刻の日陰タイルURLテンプレートを取得
 *
 * @returns タイルURLテンプレート
 */
export function getCurrentShadeTileUrl(): string {
  const now = new Date();
  const timeBucket = formatTimeBucket(now);
  return getShadeTileUrlTemplate(timeBucket);
}
