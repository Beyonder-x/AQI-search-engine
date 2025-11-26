## AQI Explorer

Full-stack project that wraps the [World Air Quality Index](https://aqicn.org/api/) (WAQI) feed behind a cached REST API and a lightweight UI so you can search for any city and inspect the latest air quality insights.

### Highlights

- Node.js + Express web service that follows REST guidelines and shields the upstream API with a configurable LRU cache (TTL + max entries).
- Front-end written in semantic HTML/CSS/vanilla JS, served by the same Express instance for zero-config local runs.
- Resilient UX: optimistic loading state, helpful validation, empty-state messaging, and attribution/forecast visuals.

### Requirements

| Dependency | Version (tested) |
|------------|------------------|
| Node.js    | 18+              |
| npm        | 9+               |

### Configuration

Copy `.env.example` into `.env` and update values. The WAQI API exposes a demo token (`demo`) but you should request your own token for production-level quotas.

```
AQI_API_TOKEN=your-waqi-token
PORT=4000
CACHE_MAX_ENTRIES=100
CACHE_TTL_MINUTES=10
```

### Scripts

| Command     | Description                                   |
|-------------|-----------------------------------------------|
| `npm run dev`   | Starts the TypeScript server with live reload. |
| `npm run build` | Emits compiled JavaScript into `dist/`.        |
| `npm start`     | Runs the compiled server (`npm run build` first). |
| `npm run lint`  | Type-checks the codebase (no emit).            |

### Running locally

```bash
npm install
cp .env.example .env
# edit .env with your AQI token
npm run dev
# visit http://localhost:4000
```

To mimic production:

```bash
npm run build
npm start
```

### API surface

`GET /api/aqi?city=<name>`

Response:

```json
{
  "data": {
    "city": "Delhi",
    "aqi": 182,
    "dominantPollutant": "pm25",
    "coordinates": { "lat": 28.66, "lon": 77.23 },
    "updatedAt": "2025-11-26T08:00:00+05:30",
    "attribution": [{ "name": "System of Air Quality Weather Forecasting And Research", "url": "https://safar.tropmet.res.in/" }],
    "sourceUrl": "https://aqicn.org/city/india/delhi/us-embassy/",
    "readings": [{ "pollutant": "pm25", "value": 182 }],
    "forecast": [{ "pollutant": "pm25", "day": "2025-11-27", "avg": 160, "min": 120, "max": 210 }]
  }
}
```

Errors return `{ "error": "message" }` with an HTTP 4xx/5xx status.

### Caching strategy

- **LRU eviction:** Once the cache reaches `CACHE_MAX_ENTRIES`, the least-recently requested city is evicted.
- **TTL enforcement:** Entries older than `CACHE_TTL_MINUTES` are discarded before reuse.
- These knobs are environment-driven so you can trade memory for freshness in different deployments.

### Front-end notes

- Single-page experience that talks to the backend via `fetch`.
- Progressive enhancement friendly (no heavy frameworks).
- Shows AQI highlights, pollutant breakdown, attribution, and forecast (when present in WAQI payloads).

### Future enhancements

- Persist cache to disk/Redis for multi-instance deployments.
- Add automated tests covering cache invalidation + API contracts.
- Expand UI charts (e.g., sparkline for daily averages, severity color scale).

