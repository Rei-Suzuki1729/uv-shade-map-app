import { integer, pgTable, text, timestamp, varchar, serial } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Managed by app logic or trigger
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * お気に入り場所テーブル
 * ユーザーが保存した場所を管理
 */
export const favoriteLocations = pgTable('favorite_locations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  latitude: varchar('latitude', { length: 20 }).notNull(),
  longitude: varchar('longitude', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 検索履歴テーブル
 * ユーザーの検索履歴を記録
 */
export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  query: varchar('query', { length: 255 }).notNull(),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  resultCount: integer('result_count').default(0),
  searchedAt: timestamp('searched_at').defaultNow().notNull(),
});

/**
 * UVデータキャッシュテーブル
 * OpenUV APIから取得したデータをキャッシュ
 */
export const uvDataCache = pgTable('uv_data_cache', {
  id: serial('id').primaryKey(),
  latitude: varchar('latitude', { length: 20 }).notNull(),
  longitude: varchar('longitude', { length: 20 }).notNull(),
  uvIndex: varchar('uv_index', { length: 10 }).notNull(),
  uvMax: varchar('uv_max', { length: 10 }),
  uvMaxTime: varchar('uv_max_time', { length: 10 }),
  ozone: varchar('ozone', { length: 10 }),
  ozoneTime: varchar('ozone_time', { length: 10 }),
  safeExposureTime: integer('safe_exposure_time'),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

/**
 * ルート履歴テーブル
 * ユーザーが検索したルートを保存
 */
export const routeHistory = pgTable('route_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  startName: varchar('start_name', { length: 255 }),
  startLat: varchar('start_lat', { length: 20 }).notNull(),
  startLng: varchar('start_lng', { length: 20 }).notNull(),
  endName: varchar('end_name', { length: 255 }),
  endLat: varchar('end_lat', { length: 20 }).notNull(),
  endLng: varchar('end_lng', { length: 20 }).notNull(),
  routeType: varchar('route_type', { length: 50 }).notNull(),
  distance: varchar('distance', { length: 20 }),
  duration: integer('duration'),
  shadePercentage: varchar('shade_percentage', { length: 10 }),
  uvExposure: varchar('uv_exposure', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 通知設定テーブル
 * ユーザーごとの通知設定
 */
export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  highUvAlert: integer('high_uv_alert').default(1).notNull(),
  highUvThreshold: varchar('high_uv_threshold', { length: 10 }).default('6.0').notNull(),
  shadeReminder: integer('shade_reminder').default(1).notNull(),
  shadeReminderInterval: integer('shade_reminder_interval').default(30).notNull(),
  pushToken: varchar('push_token', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Managed by app logic or trigger
});

/**
 * 通知履歴テーブル
 * 送信された通知の記録
 */
export const notificationHistory = pgTable('notification_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  data: text('data'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  readFlag: integer('read_flag').default(0).notNull(),
});

// 型エクスポート
export type FavoriteLocation = typeof favoriteLocations.$inferSelect;
export type NewFavoriteLocation = typeof favoriteLocations.$inferInsert;

export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;

export type UvDataCache = typeof uvDataCache.$inferSelect;
export type NewUvDataCache = typeof uvDataCache.$inferInsert;

export type RouteHistory = typeof routeHistory.$inferSelect;
export type NewRouteHistory = typeof routeHistory.$inferInsert;

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type NewNotificationSettings = typeof notificationSettings.$inferInsert;

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type NewNotificationHistory = typeof notificationHistory.$inferInsert;
