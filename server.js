import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// --- paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");
const CLIENT_DIR = path.join(ROOT, "client");
const DB_FILE = path.join(__dirname, "messages.json");

function ensureDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return [];
  }
}
function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- API ---
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

app.get("/api/messages", (req, res) => {
  const items = readDb()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  res.json({ items });
});

app.post("/api/messages", (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return res.status(400).json({ message: "Email is invalid." });
  }
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ message: "Message must be at least 10 characters." });
  }

  const db = readDb();
  const item = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  db.push(item);
  writeDb(db);

  res.status(201).json({ ok: true, item });
});

app.delete("/api/messages/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const next = db.filter(x => x.id !== id);
  writeDb(next);
  res.json({ ok: true });
});

// --- Serve Client (NO CORS needed) ---
app.use(express.static(CLIENT_DIR));

app.get("*", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
