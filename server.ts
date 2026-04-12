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

  // Enable CORS and JSON parsing at the VERY TOP
  app.use(cors());
  app.use(express.json());

  // Ultra-Aggressive Request Logger (at the VERY TOP)
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`>>> [SERVER LOG] ${req.method} ${req.originalUrl || req.url} (Path: ${req.path})`);
    next();
  });

  console.log(`>>> [SERVER START] CWD: ${process.cwd()}`);
  console.log(`>>> [SERVER START] __dirname: ${__dirname}`);

  // In-memory leaderboard with file persistence (DEFINE AT TOP)
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

  // Manual API Route Handling (Safety Net)
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Use req.path for more reliable matching
    const p = req.path;
    const m = req.method;
    
    // Handle both /api/leads and /api/v1/leads for compatibility
    if (p === '/api/leads' || p === '/api/leads/' || p === '/api/v1/leads') {
      if (m === 'GET') {
        console.log(`[MANUAL API] GET ${p} - returning ${Object.keys(leaderboard).length} leads`);
        const sortedLeads = Object.values(leaderboard).sort((a, b) => b.score - a.score);
        return res.json(sortedLeads);
      }
    }
    
    if (p === '/api/leads/update' || p === '/api/leads/update/' || p === '/api/v1/leads/update') {
      if (m === 'POST') {
        console.log(`[MANUAL API] POST ${p} - Body: ${JSON.stringify(req.body)}`);
        const { userId, name, score } = req.body;
        if (userId && name) {
          leaderboard[userId] = {
            name,
            score: score || 0,
            lastUpdate: new Date().toISOString()
          };
          saveLeaderboard();
          return res.json({ success: true, leaderboard: Object.values(leaderboard) });
        }
      }
    }
    next();
  });

  // Standard API routes for Leads
  app.get("/api/leads", (req, res) => {
    const sortedLeads = Object.values(leaderboard).sort((a, b) => b.score - a.score);
    res.json(sortedLeads);
  });

  app.post("/api/leads/update", (req, res) => {
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

  // Fallback route without /api prefix
  app.post("/leads/update", (req, res) => {
    console.log("[API] POST /leads/update hit (fallback)");
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

  // API Proxy for OpenAI
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    console.log("[API] AI Chat request");
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OpenAI API Key not configured" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API Error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "OpenAI API error", details: errorText });
      }

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("OpenAI Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to OpenAI", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // API Proxy for SpeechAce
  app.post("/api/ai/speechace", upload.single("user_audio_file"), async (req: MulterRequest, res: Response) => {
    console.log("[API] SpeechAce request");
    try {
      const apiKey = process.env.SPEECHACE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "SpeechAce API Key not configured" });
      }

      const multerFile = req.file;
      if (!multerFile) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Handle potentially pre-encoded API keys from .env
      const rawKey = apiKey.includes('%') ? decodeURIComponent(apiKey) : apiKey;

      const formData = new FormData();
      const fileBlob = new Blob([(multerFile as any).buffer], { type: multerFile.mimetype });
      formData.append("user_audio_file", fileBlob as any, multerFile.originalname);
      
      formData.append("text", req.body.text || "");
      formData.append("user_id", req.body.user_id || "student_123");

      const response = await fetch(`https://api2.speechace.com/api/scoring/text/v0.5/json?key=${encodeURIComponent(rawKey)}&dialect=en-us&include_fluency=1&include_pronunciation=1`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SpeechAce API Error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "SpeechAce API error", details: errorText });
      }

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("SpeechAce Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to SpeechAce", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Catch-all for /api to prevent fall-through to Vite
  app.use("/api", (req, res) => {
    console.warn(`[API] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Ensure Vite only handles non-API routes
    app.use((req, res, next) => {
      const isApi = req.url.startsWith('/api') || req.path.startsWith('/api');
      if (isApi) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
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
