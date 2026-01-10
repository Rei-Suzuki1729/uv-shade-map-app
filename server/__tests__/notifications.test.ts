
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { getNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead } from "../db";

// Mock the drizzle-orm module
vi.mock("drizzle-orm/mysql2", () => {
  return {
    drizzle: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    })),
  };
});

describe("server/db notification functions", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    vi.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "mysql://mock:3306/db" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("getNotificationHistory should return an array", async () => {
    const history = await getNotificationHistory(1);
    expect(history).toEqual([]);
  });

  it("markNotificationAsRead should return boolean", async () => {
    const result = await markNotificationAsRead(1, 1);
    expect(result).toBe(true);
  });

  it("markAllNotificationsAsRead should return boolean", async () => {
    const result = await markAllNotificationsAsRead(1);
    expect(result).toBe(true);
  });
});
