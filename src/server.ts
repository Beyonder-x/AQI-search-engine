import path from "node:path";
import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config";
import { fetchCityAqi } from "./services/aqiService";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/aqi", async (req: Request, res: Response) => {
  const city = req.query.city;

  if (!city || typeof city !== "string") {
    return res.status(400).json({ error: "Query parameter 'city' is required." });
  }

  try {
    const summary = await fetchCityAqi(city);
    return res.json({ data: summary });
  } catch (error) {
    console.error("Failed to fetch AQI", error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Unable to fulfill the request right now.",
    });
  }
});

const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

// SPA fallback for browser refreshes – match any path not starting with /api.
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(config.port, () => {
  console.log(`AQI service listening on http://localhost:${config.port}`);
});

