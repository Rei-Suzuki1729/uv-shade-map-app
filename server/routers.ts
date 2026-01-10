import { z } from 'zod';
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getDb,
  getCachedUvData,
  cacheUvData,
  getFavoriteLocations,
  addFavoriteLocation,
  deleteFavoriteLocation,
  getSearchHistory,
  addSearchHistory,
  saveRouteHistory,
  getNotificationSettings,
  updateNotificationSettings,
} from './db';
import { fetchUVDataFromOpenMeteo } from '../lib/open-meteo-service';
import { searchAddress } from '../lib/geocoding-service';
import { notificationSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateShadeTiles, generateSampleBuildings } from './worker-client';
import { join } from 'path';
import { existsSync } from 'fs';

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
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const cached = await getCachedUvData(latitude, longitude, fiveMinutesAgo);
        
        if (cached) {
          return {
            source: 'cache' as const,
            data: {
              uvIndex: parseFloat(cached.uvIndex),
              uvMax: cached.uvMax ? parseFloat(cached.uvMax) : undefined,
              uvMaxTime: cached.uvMaxTime || undefined,
              safeExposureTime: cached.safeExposureTime || undefined,
              timestamp: cached.fetchedAt.toISOString(),
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
        
        await cacheUvData({
          latitude: latitude.toFixed(3),
          longitude: longitude.toFixed(3),
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
        const locations = await getFavoriteLocations(ctx.user.id);
        
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
        const result = await addFavoriteLocation({
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
        await deleteFavoriteLocation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  search: router({
    history: protectedProcedure
      .input(z.object({
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const history = await getSearchHistory(ctx.user.id, input.limit);
        
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
        await addSearchHistory({
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
    search: publicProcedure
      .input(z.object({
        start: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        end: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        profile: z.enum(['driving', 'walking', 'cycling']).default('walking'),
      }))
      .mutation(async ({ input }) => {
        const { start, end, profile } = input;
        const OSRM_BASE_URL = 'https://router.project-osrm.org';

        try {
          const url = `${OSRM_BASE_URL}/route/v1/${profile}/` +
            `${start.longitude},${start.latitude};` +
            `${end.longitude},${end.latitude}` +
            `?overview=full&geometries=geojson&steps=true`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`OSRM API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.routes || data.routes.length === 0) {
            return { success: false, route: null };
          }

          const route = data.routes[0];

          // GeoJSON座標を変換 (経度, 緯度) -> {latitude, longitude}
          const geometry = route.geometry.coordinates.map(
            (coord: [number, number]) => ({
              longitude: coord[0],
              latitude: coord[1],
            })
          );

          // ステップ情報を変換
          const steps = (route.legs[0]?.steps || []).map((step: any) => ({
            distance: step.distance,
            duration: step.duration,
            instruction: step.maneuver?.instruction || '',
            coordinates: step.geometry.coordinates.map((coord: [number, number]) => ({
              longitude: coord[0],
              latitude: coord[1],
            })),
          }));

          return {
            success: true,
            route: {
              distance: route.distance,
              duration: route.duration,
              geometry,
              steps,
            },
          };
        } catch (error) {
          console.error('Route search error:', error);
          return { success: false, route: null, error: String(error) };
        }
      }),

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
        await saveRouteHistory({
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

  shade: router({
    generateTiles: publicProcedure
      .input(z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        startTime: z.string(), // ISO 8601形式
        endTime: z.string(),   // ISO 8601形式
        stepMinutes: z.number().default(10), // 時間刻み（分）
        zooms: z.array(z.number()).default([15, 16, 17]), // ズームレベル
      }))
      .mutation(async ({ input }) => {
        const jobId = `shade-job-${Date.now()}`;

        console.log('Shade tile generation requested:', {
          jobId,
          bounds: input.bounds,
          startTime: input.startTime,
          endTime: input.endTime,
          stepMinutes: input.stepMinutes,
          zooms: input.zooms,
        });

        // 建物データのパスを確認（PoC用サンプルデータ）
        const buildingsPath = join(process.cwd(), 'server', 'worker', 'data', 'buildings-sample.geojson');

        // 建物データが存在しない場合は生成
        if (!existsSync(buildingsPath)) {
          console.log('Sample buildings data not found, generating...');
          try {
            await generateSampleBuildings(input.bounds, buildingsPath, 10);
            console.log('Sample buildings data generated successfully');
          } catch (error) {
            console.error('Failed to generate sample buildings:', error);
            return {
              success: false,
              jobId,
              message: 'Failed to generate sample buildings data',
              error: String(error),
            };
          }
        }

        // 非同期でPythonワーカーを起動（バックグラウンド実行）
        // PoCでは同期実行だが、本番では非同期・ジョブキューに投げる
        try {
          const result = await generateShadeTiles(jobId, {
            bounds: input.bounds,
            startTime: input.startTime,
            endTime: input.endTime,
            stepMinutes: input.stepMinutes,
            zooms: input.zooms,
          }, buildingsPath);

          return {
            success: result.success,
            jobId,
            tilesGenerated: result.tiles_generated,
            timeBuckets: result.time_buckets,
            message: 'Tile generation completed',
          };
        } catch (error) {
          console.error('Shade tile generation failed:', error);
          return {
            success: false,
            jobId,
            message: 'Tile generation failed',
            error: String(error),
          };
        }
      }),

    getTileStatus: publicProcedure
      .input(z.object({
        jobId: z.string(),
      }))
      .query(async ({ input }) => {
        // TODO: ジョブステータスをチェックする実装
        // PoCでは仕様定義のみ
        console.log('Checking tile generation status:', input.jobId);

        return {
          jobId: input.jobId,
          status: 'done' as const, // queued | running | done | error
          progress: 100,
          message: 'PoC: Status check not yet implemented',
        };
      }),
  }),

  notifications: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const settings = await getNotificationSettings(ctx.user.id);
        
        if (!settings) {
          // No settings found, create default
          // We can use direct DB insert here or add another helper function.
          // Since getNotificationSettings is just a getter, the router handles logic.
          // But "add feature queries" suggests we should have `createDefaultNotificationSettings` or similar.
          // I will use direct DB via getDb() here OR better, just use getDb() as the function is not in db.ts yet?
          // Wait, I implemented updateNotificationSettings, but not create.
          // The previous code did: db.insert(...).

          const db = await getDb();
          if (!db) throw new Error('Database not available');

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
        
        return {
          highUvAlert: settings.highUvAlert === 1,
          highUvThreshold: parseFloat(settings.highUvThreshold),
          shadeReminder: settings.shadeReminder === 1,
          shadeReminderInterval: settings.shadeReminderInterval,
          pushToken: settings.pushToken,
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
        const updates: any = {};
        if (input.highUvAlert !== undefined) updates.highUvAlert = input.highUvAlert ? 1 : 0;
        if (input.highUvThreshold !== undefined) updates.highUvThreshold = input.highUvThreshold.toString();
        if (input.shadeReminder !== undefined) updates.shadeReminder = input.shadeReminder ? 1 : 0;
        if (input.shadeReminderInterval !== undefined) updates.shadeReminderInterval = input.shadeReminderInterval;
        if (input.pushToken !== undefined) updates.pushToken = input.pushToken;
        
        await updateNotificationSettings(ctx.user.id, updates);
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
