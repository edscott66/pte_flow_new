// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import "dotenv/config";

// logic/daily_goals_engine.ts
var ALL_TASKS = [
  {
    task_name: "Read Aloud Pacing",
    skill_trained: "Speaking fluency",
    why_it_matters_for_pte: "Ensures a steady rhythm without hesitations, a key scoring factor.",
    estimated_time_minutes: 3,
    module_id: "read-aloud"
  },
  {
    task_name: "Describe Image Trends",
    skill_trained: "Speaking fluency",
    why_it_matters_for_pte: "Develops the ability to speak continuously while analyzing visual data.",
    estimated_time_minutes: 4,
    module_id: "describe-image"
  },
  {
    task_name: "Repeat Sentence Shadowing",
    skill_trained: "Listening recall",
    why_it_matters_for_pte: "Trains the brain to retain and reproduce complex sentence structures.",
    estimated_time_minutes: 2,
    module_id: "repeat-sentence"
  },
  {
    task_name: "Listening Fill in the Blanks",
    skill_trained: "Listening recall",
    why_it_matters_for_pte: "Sharpens real-time word recognition and spelling accuracy.",
    estimated_time_minutes: 3,
    module_id: "fill-blanks-listening"
  },
  {
    task_name: "Summarize Written Text",
    skill_trained: "Grammar control",
    why_it_matters_for_pte: "Tests the ability to condense information into a single, grammatically perfect sentence.",
    estimated_time_minutes: 4,
    module_id: "summarize-written"
  },
  {
    task_name: "Pronunciation Drill: Vowel Clarity",
    skill_trained: "Pronunciation consistency",
    why_it_matters_for_pte: "Ensures AI scoring engines can accurately map your speech to text.",
    estimated_time_minutes: 2,
    module_id: "read-aloud"
  },
  {
    task_name: "Speed Reading: Scanning for Keywords",
    skill_trained: "Reading speed & scanning",
    why_it_matters_for_pte: "Reduces time spent on long passages by locating key info faster.",
    estimated_time_minutes: 3,
    module_id: "re-order-paragraphs"
  },
  {
    task_name: "Vocabulary Expansion: Academic Synonyms",
    skill_trained: "Vocabulary range",
    why_it_matters_for_pte: "Increases lexical diversity scores in both writing and speaking.",
    estimated_time_minutes: 3,
    module_id: "fill-blanks-rw"
  }
];
function generateDailyGoals(performance, level = "intermediate", timeAvailable = 10) {
  let selectedTasks = [];
  let adjustments = "Default high-impact rotation applied.";
  let feedback = "Focus on maintaining a steady pace across all modules.";
  let signals = ["Fluency stability", "Pronunciation consistency", "Listening recall accuracy"];
  let link = "Consistently hitting these goals will build the stamina needed for the full mock exam.";
  if (!performance) {
    selectedTasks = ALL_TASKS.slice(0, 3);
  } else {
    const priorities = [];
    if ((performance.fluency || 100) < 60) {
      priorities.push("Speaking fluency");
      adjustments = "Prioritizing fluency due to recent scoring trends.";
      feedback = "Your oral fluency is currently the biggest bottleneck. Avoid self-correction at all costs.";
    }
    if ((performance.listening_recall || 100) < 60) {
      priorities.push("Listening recall");
      adjustments = "Increased focus on recall tasks to stabilize listening scores.";
      feedback = "Focus on the 'meaning' of the sentence rather than just the words to improve recall.";
    }
    if ((performance.grammar || 100) < 60) {
      priorities.push("Grammar control");
      adjustments = "Adding structured writing tasks to address grammar inconsistencies.";
      feedback = "Review your punctuation in Summarize Written Text; one error can invalidate the whole response.";
    }
    if ((performance.pronunciation || 100) < 60) {
      priorities.push("Pronunciation consistency");
      adjustments = "Focusing on phonetic clarity to improve AI recognition.";
      feedback = "Enunciate word endings clearly, especially 's' and 'ed' suffixes.";
    }
    const prioritizedTasks = ALL_TASKS.filter((t) => priorities.includes(t.skill_trained));
    const otherTasks = ALL_TASKS.filter((t) => !priorities.includes(t.skill_trained));
    selectedTasks = [...prioritizedTasks, ...otherTasks].slice(0, Math.min(5, Math.max(3, Math.floor(timeAvailable / 3))));
    if (performance.reading_speed) {
      signals.push(`Reading speed (${performance.reading_speed} WPM)`);
    }
    if (performance.grammar) {
      signals.push("Grammar accuracy under time pressure");
    }
  }
  signals = Array.from(new Set(signals)).slice(0, 5);
  if (signals.length < 3) {
    signals.push("Vocabulary diversity", "Time management efficiency");
  }
  if (performance && (performance.listening_recall || 100) < 50) {
    link = "If listening accuracy remains low today, schedule a Listening Booster session later this week.";
  } else if (performance && (performance.fluency || 100) < 50) {
    link = "Focus on fluency today to prepare for the Speaking Intensive workshop on Friday.";
  }
  return {
    daily_goals: selectedTasks,
    adaptive_adjustments: adjustments,
    micro_feedback: feedback,
    progress_signals: signals,
    weekly_link: link,
    readiness_score: performance ? Math.round(((performance.fluency || 0) + (performance.listening_recall || 0) + (performance.grammar || 0) + (performance.pronunciation || 0)) / 4) : 50
  };
}

// api/get_daily_goals.ts
function getDailyGoalsHandler(req, res) {
  const method = req.method;
  const body = req.body || {};
  console.log(`[HANDLER] getDailyGoalsHandler [${method}] body:`, JSON.stringify(body));
  try {
    const performance = body.performance;
    const level = body.level || "intermediate";
    const time_available = body.time_available || 10;
    const goals = generateDailyGoals(
      performance,
      level,
      time_available
    );
    console.log(`[HANDLER] Success. Generated ${goals.daily_goals.length} tasks.`);
    res.json(goals);
  } catch (error) {
    console.error("Error generating daily goals:", error);
    res.status(500).json({ error: "Failed to generate daily goals engine logic" });
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isProd = process.env.NODE_ENV === "production";
var distPath = path.resolve(process.cwd(), "dist");
async function startServer() {
  const PORT = 3e3;
  const app = express();
  console.log(`[FORENSIC] Booting Server...`);
  console.log(`[FORENSIC] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[FORENSIC] isProd: ${isProd}`);
  console.log(`[FORENSIC] distPath: ${distPath}`);
  console.log(`[FORENSIC] __dirname: ${__dirname}`);
  console.log(`[FORENSIC] fetch available: ${typeof fetch !== "undefined"}`);
  const LEADS_FILE = isProd ? "/tmp/leaderboard.json" : path.join(process.cwd(), "leaderboard.json");
  let leaderboard = {};
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
  if (isProd) {
    console.log(`[FORENSIC] Checking dist/index.html: ${fs.existsSync(path.join(distPath, "index.html"))}`);
  }
  process.on("uncaughtException", (err) => {
    console.error("[FATAL CRASH] Uncaught Exception:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL CRASH] Unhandled Rejection:", reason);
  });
  app.all("/api/health", (req, res) => {
    res.json({
      status: "ok",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      isProd,
      method: req.method,
      url: req.url
    });
  });
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    if (req.url.startsWith("/api")) {
      console.log(`[API_DEBUG] ${req.method} ${req.url} (Body keys: ${Object.keys(req.body || {})})`);
    }
    next();
  });
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
    leaderboard[userId] = { name, score: score || 0, lastUpdate: (/* @__PURE__ */ new Date()).toISOString() };
    saveLeaderboard();
    res.json({ success: true });
  });
  app.post("/api/ai/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing" });
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${req.body.model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body.payload)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Gemini error" });
    }
  });
  app.all("/api/*", (req, res) => {
    console.warn(`[API_MISS] No route matched for: ${req.method} ${req.url}`);
    res.status(404).json({
      error: "API endpoint not found",
      method: req.method,
      path: req.url
    });
  });
  if (!isProd) {
    console.log("[SERVER] Dev Mode: Loading Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Prod Mode: Serving static files...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const url = req.originalUrl || req.url;
      if (url.startsWith("/api")) {
        console.warn(`[API_404] No route matched for: ${url}`);
        return res.status(404).json({ error: "API route not found on this server" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
\u{1F680} [FORENSIC SUCCESS] Server listening on port ${PORT}`);
  });
}
startServer();
