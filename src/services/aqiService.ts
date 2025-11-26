import axios from "axios";
import { config } from "../config";
import { LruCache } from "../cache/lruCache";

export interface PollutantReading {
  pollutant: string;
  value: number;
}

export interface DailyForecast {
  pollutant: string;
  day: string;
  avg: number;
  min: number;
  max: number;
}

export interface CityAqiSummary {
  city: string;
  aqi: number | null;
  dominantPollutant: string | null;
  coordinates: { lat: number | null; lon: number | null };
  updatedAt: string | null;
  attribution: { name: string; url: string }[];
  sourceUrl: string | null;
  readings: PollutantReading[];
  forecast: DailyForecast[];
}

interface WaqiApiResponse {
  status: "ok" | "error";
  data: WaqiApiData | string;
}

interface WaqiApiData {
  aqi?: number;
  dominentpol?: string;
  city?: { name?: string; url?: string; geo?: [number, number] };
  time?: { s?: string; iso?: string };
  attributions?: { name?: string; url?: string }[];
  iaqi?: Record<string, { v?: number }>;
  forecast?: {
    daily?: Record<string, Array<{ day: string; avg?: number; min?: number; max?: number }>>;
  };
}

const cache = new LruCache<CityAqiSummary>({
  maxEntries: config.cache.maxEntries,
  ttlMs: config.cache.ttlMs,
});

export async function fetchCityAqi(city: string): Promise<CityAqiSummary> {
  const normalizedCity = city.trim();
  if (!normalizedCity) {
    throw new Error("City must be provided.");
  }

  const cached = cache.get(normalizedCity);
  if (cached) {
    return cached;
  }

  if (!config.upstream.token) {
    throw new Error("AQI_API_TOKEN is not configured.");
  }

  const url = `${config.upstream.baseUrl}/${encodeURIComponent(normalizedCity)}/?token=${config.upstream.token}`;

  const { data } = await axios.get<WaqiApiResponse>(url, {
    timeout: 7000,
  });

  if (data.status !== "ok") {
    const errorMessage = typeof data.data === "string" ? data.data : "Upstream API responded with an error.";
    throw new Error(errorMessage);
  }

  if (typeof data.data === "string") {
    throw new Error(data.data);
  }

  const summary = mapToSummary(data.data, normalizedCity);
  cache.set(normalizedCity, summary);
  return summary;
}

function mapToSummary(data: WaqiApiData, fallbackCity: string): CityAqiSummary {
  const readings = Object.entries(data.iaqi ?? {})
    .filter(([, reading]) => typeof reading?.v === "number")
    .map(([pollutant, reading]) => ({
      pollutant,
      value: reading?.v as number,
    }))
    .sort((a, b) => b.value - a.value);

  const forecast = mapForecast(data.forecast?.daily);

  return {
    city: data.city?.name ?? fallbackCity,
    aqi: typeof data.aqi === "number" ? data.aqi : null,
    dominantPollutant: data.dominentpol ?? null,
    coordinates: {
      lat: data.city?.geo?.[0] ?? null,
      lon: data.city?.geo?.[1] ?? null,
    },
    updatedAt: data.time?.iso ?? data.time?.s ?? null,
    attribution: (data.attributions ?? [])
      .filter((attrib): attrib is { name: string; url: string } => Boolean(attrib?.name && attrib?.url))
      .map((attrib) => ({ name: attrib.name!, url: attrib.url! })),
    sourceUrl: data.city?.url ?? null,
    readings,
    forecast,
  };
}

function mapForecast(
  dailyForecast: Record<string, Array<{ day: string; avg?: number; min?: number; max?: number }>> | undefined,
): DailyForecast[] {
  if (!dailyForecast) return [];

  const normalized: DailyForecast[] = [];
  Object.entries(dailyForecast).forEach(([pollutant, values]) => {
    values.forEach((value) => {
      if (!value?.day) return;
      normalized.push({
        pollutant,
        day: value.day,
        avg: value.avg ?? NaN,
        min: value.min ?? NaN,
        max: value.max ?? NaN,
      });
    });
  });

  return normalized.sort((a, b) => a.day.localeCompare(b.day));
}

