// server.js
// Requires Node.js 18+ (uses global fetch). Run: node server.js
import express from "express";

const API_BASE = "https://api.warframestat.us/pc";
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static("public")); // serve public/index.html and assets

// Simple proxy for single endpoints: /api/fissures -> warframestat.us/pc/fissures
app.get("/api/:endpoint", async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    const url = `${API_BASE}/${endpoint}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Upstream ${resp.status}` });
    }
    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Proxy failure", message: String(err) });
  }
});

// Aggregated search endpoint: /api/search?q=term
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  if (!q) return res.status(400).json({ error: "Missing query param 'q'" });

  const endpoints = [
    "fissures",
    "alerts",
    "invasions",
    "sortie",
    "events",
    "voidTrader",
    "archonHunt",
    "cetusCycle",
    "vallisCycle",
    "cambionCycle",
    "earthCycle",
    "arbitration"
  ];

  try {
    const fetches = endpoints.map(async (ep) => {
      try {
        const r = await fetch(`${API_BASE}/${ep}`);
        if (!r.ok) return { ep, data: null };
        const data = await r.json();
        return { ep, data };
      } catch {
        return { ep, data: null };
      }
    });

    const results = await Promise.all(fetches);

    // naive filter: convert objects to strings and search for q
    const matches = {};
    for (const { ep, data } of results) {
      if (!data) continue;
      const text = JSON.stringify(data).toLowerCase();
      if (text.includes(q)) matches[ep] = data;
    }

    return res.json({ query: q, matches });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", message: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (Node.js ${process.version})`);
});
