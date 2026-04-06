import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import { Blob } from "buffer";
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

  // Enable CORS for all origins (important for mobile apps)
  app.use(cors());
  app.use(express.json());

  // Request logger for debugging
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Proxy for OpenAI
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
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
      // Use type assertion to satisfy VS Code for the buffer and Blob
      const fileBlob = new Blob([(multerFile as any).buffer], { type: multerFile.mimetype });
      formData.append("user_audio_file", fileBlob as any, multerFile.originalname);
      
      formData.append("text", req.body.text || "");
      formData.append("user_id", req.body.user_id || "student_123");

      // Use api2.speechace.com as specified by the user for their region
      // Changed dialect from 'us' to 'en-us' to fix the "invalid parameter" error
      // Added include_fluency=1 and include_pronunciation=1 to get detailed scores
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
      console.log(`[SpeechAce Response Data]:`, JSON.stringify(data, null, 2));
      res.status(response.status).json(data);
    } catch (error) {
      console.error("SpeechAce Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to SpeechAce", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Ensure Vite only handles non-API routes
    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
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
