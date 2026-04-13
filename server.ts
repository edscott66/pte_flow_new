import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import { Blob } from "buffer";
import fs from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

// Define a custom request type for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. In-memory leaderboard with file persistence (DEFINE AT THE VERY TOP)
  const LEADS_FILE = path.join(process.cwd(), "leaderboard.json");
  let leaderboard: Record<string, { name: string, score: number, lastUpdate: string }> = {};

  const saveLeaderboard = () => {
    try {
      const data = JSON.stringify(leaderboard, null, 2);
      fs.writeFileSync(LEADS_FILE, data);
      console.log(`[Leaderboard] Saved ${Object.keys(leaderboard).length} entries to ${LEADS_FILE}`);
    } catch (err) {
      console.error("[Leaderboard] Failed to save to file:", err);
    }
  };

  // Load leaderboard from file if it exists
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, "utf-8");
      leaderboard = JSON.parse(data);
      console.log(`[Leaderboard] Loaded ${Object.keys(leaderboard).length} entries from ${LEADS_FILE}`);
    } else {
      console.log(`[Leaderboard] No existing file found at ${LEADS_FILE}. Starting fresh.`);
      saveLeaderboard();
    }
  } catch (err) {
    console.error("[Leaderboard] Failed to load from file:", err);
  }

  // 2. Middleware
  app.use(cors());
  app.use(express.json());

  // 3. ABSOLUTE TOP PRIORITY API ROUTES
  // We define these directly on 'app' to ensure they are hit before ANY other middleware
  app.get("/api/leads", (req, res) => {
    console.log(`[API GET] /api/leads - returning ${Object.keys(leaderboard).length} leads`);
    const sortedLeads = Object.values(leaderboard).sort((a, b) => b.score - a.score);
    res.json(sortedLeads);
  });

  app.post("/api/leads/update", (req, res) => {
    console.log(`[API POST] /api/leads/update - Body: ${JSON.stringify(req.body)}`);
    const { userId, name, score } = req.body;
    if (!userId || !name) return res.status(400).json({ error: "Missing userId or name" });
    
    leaderboard[userId] = {
      name,
      score: score || 0,
      lastUpdate: new Date().toISOString()
    };
    saveLeaderboard();
    res.json({ success: true, leaderboard: Object.values(leaderboard) });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", entries: Object.keys(leaderboard).length });
  });

  // 4. Ultra-Aggressive Request Logger (for debugging)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isApi = req.path.startsWith('/api') || req.url.startsWith('/api');
    console.log(`>>> [SERVER LOG] ${req.method} ${req.path} (isApi: ${isApi})`);
    if (isApi) {
      // If it's an API call but reached here, it means it missed the routes above
      console.warn(`[API MISS] ${req.method} ${req.path} - Returning JSON 404`);
      return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
    }
    next();
  });

  // 5. OTHER API ROUTES (Proxies)
  const apiRouter = express.Router();

  apiRouter.post("/ai/gemini", async (req: Request, res: Response) => {
    console.log("[API] Gemini Proxy request");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${req.body.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body.payload),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to Gemini" });
    }
  });

  // Mount the router at /api
  app.use("/api", apiRouter);

  // 5. Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Ensure Vite only handles non-API routes
    app.use((req, res, next) => {
      const isApi = req.url.startsWith('/api') || req.path.startsWith('/api');
      if (isApi) {
        // If it's an API call but reached here, it means it missed the routes above
        console.warn(`[API MISS] ${req.method} ${req.path} - Returning JSON 404`);
        return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // API 404 handler for production
    app.use("/api", (req, res) => {
      res.status(404).json({ error: "API route not found" });
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 PTE Flow Backend is running!`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://YOUR_IP_ADDRESS:${PORT} (Use this in your .env file)`);
    console.log(`\nNote: Ensure your phone is on the same Wi-Fi network.`);
  });
}

startServer();
