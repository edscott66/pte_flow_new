import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import "dotenv/config";
import getDailyGoalsHandler from "./api/get_daily_goals.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forensic path resolution for production
const distPath = path.resolve(__dirname, "dist");
const isProd = process.env.NODE_ENV === "production" || fs.existsSync(distPath);

async function startServer() {
  const PORT = 3000;
  const app = express();

  console.log(`[FORENSIC] Booting Server...`);
  console.log(`[FORENSIC] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[FORENSIC] distPath: ${distPath}`);
  console.log(`[FORENSIC] isProd: ${isProd}`);

  // 1. TOP-LEVEL ERROR HANDLING (LOG EVERYTHING)
  process.on("uncaughtException", (err) => {
    console.error("[FATAL CRASH] Uncaught Exception:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL CRASH] Unhandled Rejection:", reason);
  });

  // 2. ULTRA-FAST HEALTH CHECK (BEFORE MIDDLEWARE)
  app.all("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      isProd,
      method: req.method,
      url: req.url
    });
  });

  // 3. CORE MIDDLEWARE
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API_DEBUG] ${req.method} ${req.url} (Body keys: ${Object.keys(req.body || {})})`);
    }
    next();
  });

  // 4. DEFENSIVE API ROUTES (Direct on app to avoid router quirks)
  app.all(["/api/daily-goals", "/api/daily-goals/"], (req, res) => {
    console.log(`[API] HIT: daily-goals [${req.method}]`);
    getDailyGoalsHandler(req, res);
  });

  app.all(["/api/leads", "/api/leads/"], (req, res) => {
    const sortedLeads = Object.values(leaderboard).sort((a, b) => b.score - a.score);
    res.json(sortedLeads);
  });

  app.post(["/api/leads/update", "/api/leads/update/"], (req, res) => {
    const { userId, name, score } = req.body;
    if (!userId || !name) return res.status(400).json({ error: "Missing userId or name" });
    leaderboard[userId] = { name, score: score || 0, lastUpdate: new Date().toISOString() };
    saveLeaderboard();
    res.json({ success: true });
  });

  // 4.5 CATCH-ALL API (Prevent fallthrough to SPA index.html)
  app.all("/api/*", (req, res) => {
    console.warn(`[API_MISS] No route matched for: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API endpoint not found",
      method: req.method,
      path: req.url 
    });
  });

  // 5. Leaderboard logic
  const LEADS_FILE = path.join(process.cwd(), "leaderboard.json");
  let leaderboard: Record<string, { name: string, score: number, lastUpdate: string }> = {};

  const saveLeaderboard = () => {
    try {
      fs.writeFileSync(LEADS_FILE, JSON.stringify(leaderboard, null, 2));
    } catch (err) {
      console.error("[Leaderboard] Save failure:", err);
    }
  };

  try {
    if (fs.existsSync(LEADS_FILE)) {
      leaderboard = JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[Leaderboard] Load failure:", err);
  }

  // 6. Gemini Proxy
  app.post("/api/ai/gemini", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing" });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${req.body.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body.payload),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Gemini error" });
    }
  });

  // 7. ENVIRONMENT-SPECIFIC MIDDLEWARE
  if (!isProd) {
    console.log("[SERVER] Dev Mode: Loading Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Prod Mode: Serving static files...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Don't swallow API 404s - use originalUrl to be safe
      const url = req.originalUrl || req.url;
      if (url.startsWith("/api")) {
        console.warn(`[API_404] No route matched for: ${url}`);
        return res.status(404).json({ error: "API route not found on this server" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 [FORENSIC SUCCESS] Server listening on port ${PORT}`);
  });
}

startServer();
