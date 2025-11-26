import dotenv from "dotenv";

dotenv.config();

const minutesToMs = (minutes: number) => minutes * 60 * 1000;

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 4000),
  upstream: {
    baseUrl: process.env.AQI_API_BASE ?? "https://api.waqi.info/feed",
    token: process.env.AQI_API_TOKEN ?? "demo",
  },
  cache: {
    maxEntries: parseNumber(process.env.CACHE_MAX_ENTRIES, 100),
    ttlMs: minutesToMs(parseNumber(process.env.CACHE_TTL_MINUTES, 10)),
  },
};

export type AppConfig = typeof config;

