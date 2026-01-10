import { z } from 'zod';
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getDb,
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './db';
import { fetchUVDataFromOpenMeteo } from '../lib/open-meteo-service';
import { searchAddress } from '../lib/geocoding-service';
import { 
  favoriteLocations, 
  searchHistory, 
  uvDataCache, 
  routeHistory,
  notificationSettings,
} from '../drizzle/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // UV Shade Map API
  uv: router({
    getData: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
      }))
      .query(async ({ input }) => {
        const { latitude, longitude } = input;
        const latStr = latitude.toFixed(3);
        const lngStr = longitude.toFixed(3);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }
        
        const cached = await db
          .select()
          .from(uvDataCache)
          .where(
            and(
              eq(uvDataCache.latitude, latStr),
              eq(uvDataCache.longitude, lngStr),
              gte(uvDataCache.fetchedAt, fiveMinutesAgo)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          return {
            source: 'cache' as const,
            data: {
              uvIndex: parseFloat(cached[0].uvIndex),
              uvMax: cached[0].uvMax ? parseFloat(cached[0].uvMax) : undefined,
              uvMaxTime: cached[0].uvMaxTime || undefined,
              safeExposureTime: cached[0].safeExposureTime || undefined,
              timestamp: cached[0].fetchedAt.toISOString(),
            },
          };
        }
        
        // Open-Meteo APIからリアルタイムUVデータを取得
        let uvData;
        try {
          const openMeteoData = await fetchUVDataFromOpenMeteo(latitude, longitude);
          uvData = {
            uvIndex: openMeteoData.uvIndex,
            uvMax: openMeteoData.uvIndexMax,
            uvMaxTime: '12:00',
            safeExposureTime: Math.round(200 / (openMeteoData.uvIndex + 1)),
            timestamp: openMeteoData.timestamp,
          };
        } catch (error) {
          console.error('Failed to fetch from Open-Meteo, using fallback:', error);
          // フォールバック: シミュレーションデータ
          const simulatedUvIndex = Math.max(0, Math.min(11, 
            5 + Math.sin((new Date().getHours() - 6) * Math.PI / 12) * 5
          ));
          uvData = {
            uvIndex: simulatedUvIndex,
            uvMax: simulatedUvIndex + 2,
            uvMaxTime: '12:00',
            safeExposureTime: Math.round(200 / (simulatedUvIndex + 1)),
            timestamp: new Date().toISOString(),
          };
        }
        
        await db.insert(uvDataCache).values({
          latitude: latStr,
          longitude: lngStr,
          uvIndex: uvData.uvIndex.toFixed(2),
          uvMax: uvData.uvMax.toFixed(2),
          uvMaxTime: uvData.uvMaxTime,
          safeExposureTime: uvData.safeExposureTime,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        
        return {
          source: 'api' as const,
          data: uvData,
        };
      }),
  }),

  favorites: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const locations = await db
          .select()
          .from(favoriteLocations)
          .where(eq(favoriteLocations.userId, ctx.user.id))
          .orderBy(desc(favoriteLocations.createdAt));
        
        return locations.map((loc: any) => ({
          ...loc,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
        }));
      }),

    add: protectedProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const result = await db.insert(favoriteLocations).values({
          userId: ctx.user.id,
          name: input.name,
          address: input.address,
          latitude: input.latitude.toString(),
          longitude: input.longitude.toString(),
        });
        
        return { success: true, id: result[0].insertId };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db
          .delete(favoriteLocations)
          .where(
            and(
              eq(favoriteLocations.id, input.id),
              eq(favoriteLocations.userId, ctx.user.id)
            )
          );
        
        return { success: true };
      }),
  }),

  search: router({
    history: protectedProcedure
      .input(z.object({
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const history = await db
          .select()
          .from(searchHistory)
          .where(eq(searchHistory.userId, ctx.user.id))
          .orderBy(desc(searchHistory.searchedAt))
          .limit(input.limit);
        
        return history.map((h: any) => ({
          ...h,
          latitude: h.latitude ? parseFloat(h.latitude) : undefined,
          longitude: h.longitude ? parseFloat(h.longitude) : undefined,
        }));
      }),

    add: protectedProcedure
      .input(z.object({
        query: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        resultCount: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.insert(searchHistory).values({
          userId: ctx.user.id,
          query: input.query,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          resultCount: input.resultCount,
        });
        
        return { success: true };
      }),

    address: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().default(5),
      }))
      .query(async ({ input }) => {
        // Nominatim APIを使用して日本語住所検索
        try {
          const results = await searchAddress(input.query, input.limit);
          return results.map(r => ({
            name: r.name,
            address: r.displayName,
            latitude: r.latitude,
            longitude: r.longitude,
            type: r.type,
            importance: r.importance,
          }));
        } catch (error) {
          console.error('Failed to search address, using fallback:', error);
          // フォールバック: モックデータ
          const mockResults = [
            {
              name: '東京駅',
              address: '東京都千代田区丸の内1丁目',
              latitude: 35.6812,
              longitude: 139.7671,
              type: 'station',
              importance: 1.0,
            },
            {
              name: '渋谷駅',
              address: '東京都渋谷区道玄坂1丁目',
              latitude: 35.6580,
              longitude: 139.7016,
              type: 'station',
              importance: 0.9,
            },
          ].filter(r => 
            r.name.includes(input.query) || r.address.includes(input.query)
          );
          return mockResults;
        }
      }),
  }),

  routes: router({
    save: protectedProcedure
      .input(z.object({
        startName: z.string().optional(),
        startLat: z.number(),
        startLng: z.number(),
        endName: z.string().optional(),
        endLat: z.number(),
        endLng: z.number(),
        routeType: z.enum(['fastest', 'balanced', 'shadiest']),
        distance: z.number().optional(),
        duration: z.number().optional(),
        shadePercentage: z.number().optional(),
        uvExposure: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.insert(routeHistory).values({
          userId: ctx.user.id,
          startName: input.startName,
          startLat: input.startLat.toString(),
          startLng: input.startLng.toString(),
          endName: input.endName,
          endLat: input.endLat.toString(),
          endLng: input.endLng.toString(),
          routeType: input.routeType,
          distance: input.distance?.toString(),
          duration: input.duration,
          shadePercentage: input.shadePercentage?.toString(),
          uvExposure: input.uvExposure?.toString(),
        });
        
        return { success: true };
      }),
  }),

  notifications: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const settings = await db
          .select()
          .from(notificationSettings)
          .where(eq(notificationSettings.userId, ctx.user.id))
          .limit(1);
        
        if (settings.length === 0) {
          await db.insert(notificationSettings).values({
            userId: ctx.user.id,
            highUvAlert: 1,
            highUvThreshold: '6.0',
            shadeReminder: 1,
            shadeReminderInterval: 30,
          });
          
          return {
            highUvAlert: true,
            highUvThreshold: 6.0,
            shadeReminder: true,
            shadeReminderInterval: 30,
            pushToken: null,
          };
        }
        
        const s = settings[0];
        return {
          highUvAlert: s.highUvAlert === 1,
          highUvThreshold: parseFloat(s.highUvThreshold),
          shadeReminder: s.shadeReminder === 1,
          shadeReminderInterval: s.shadeReminderInterval,
          pushToken: s.pushToken,
        };
      }),

    updateSettings: protectedProcedure
      .input(z.object({
        highUvAlert: z.boolean().optional(),
        highUvThreshold: z.number().optional(),
        shadeReminder: z.boolean().optional(),
        shadeReminderInterval: z.number().optional(),
        pushToken: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const updates: any = {};
        if (input.highUvAlert !== undefined) updates.highUvAlert = input.highUvAlert ? 1 : 0;
        if (input.highUvThreshold !== undefined) updates.highUvThreshold = input.highUvThreshold.toString();
        if (input.shadeReminder !== undefined) updates.shadeReminder = input.shadeReminder ? 1 : 0;
        if (input.shadeReminderInterval !== undefined) updates.shadeReminderInterval = input.shadeReminderInterval;
        if (input.pushToken !== undefined) updates.pushToken = input.pushToken;
        
        await db
          .update(notificationSettings)
          .set(updates)
          .where(eq(notificationSettings.userId, ctx.user.id));
        
        return { success: true };
      }),

    history: protectedProcedure
      .input(z.object({
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const history = await getNotificationHistory(ctx.user.id, input.limit);
        return history.map((h) => ({
          ...h,
          readFlag: h.readFlag === 1,
        }));
      }),

    markRead: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await markNotificationAsRead(input.id, ctx.user.id);
        return { success };
      }),

    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const success = await markAllNotificationsAsRead(ctx.user.id);
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
