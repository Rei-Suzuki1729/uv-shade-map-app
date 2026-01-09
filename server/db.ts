import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  favoriteLocations, NewFavoriteLocation,
  searchHistory, NewSearchHistory,
  uvDataCache, NewUvDataCache,
  routeHistory, NewRouteHistory,
  notificationSettings,
  NewNotificationSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Favorites
export async function getFavoriteLocations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(favoriteLocations)
    .where(eq(favoriteLocations.userId, userId))
    .orderBy(desc(favoriteLocations.createdAt));
}

export async function addFavoriteLocation(location: NewFavoriteLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(favoriteLocations).values(location);
}

export async function deleteFavoriteLocation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .delete(favoriteLocations)
    .where(
      and(
        eq(favoriteLocations.id, id),
        eq(favoriteLocations.userId, userId)
      )
    );
}

// Search History
export async function getSearchHistory(userId: number, limitCount: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limitCount);
}

export async function addSearchHistory(history: NewSearchHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(searchHistory).values(history);
}

// UV Data
export async function getCachedUvData(latitude: number | string, longitude: number | string, minFetchedAt?: Date) {
  const db = await getDb();
  if (!db) return undefined;

  const latStr = typeof latitude === 'number' ? latitude.toFixed(3) : latitude;
  const lngStr = typeof longitude === 'number' ? longitude.toFixed(3) : longitude;

  let query = db
    .select()
    .from(uvDataCache)
    .where(
      and(
        eq(uvDataCache.latitude, latStr),
        eq(uvDataCache.longitude, lngStr),
        minFetchedAt ? gte(uvDataCache.fetchedAt, minFetchedAt) : undefined
      )
    );

  const result = await query.limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function cacheUvData(data: NewUvDataCache) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(uvDataCache).values(data);
}

// Route History
export async function saveRouteHistory(route: NewRouteHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(routeHistory).values(route);
}

// Notification Settings
export async function getNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateNotificationSettings(userId: number, updates: Partial<NewNotificationSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(notificationSettings)
    .set(updates)
    .where(eq(notificationSettings.userId, userId));
}
