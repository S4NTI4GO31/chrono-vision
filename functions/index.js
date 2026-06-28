// functions/index.js — Chrono-Vision Cloud Functions
// Server-side: ML processing, Firebase triggers, storage management
// Deploy: firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.database();

// ─────────────────────────────────────────────────
// 1. HTTP FUNCTION: ML Reconstruction (server-side)
//    POST /reconstructLocation
//    Body: { locationId, targetYear, photoBase64? }
// ─────────────────────────────────────────────────
exports.reconstructLocation = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const { locationId, targetYear = 2010, photoBase64, userId = "anonymous" } = req.body;

    if (!locationId) {
      res.status(400).json({ error: "locationId is required" });
      return;
    }

    try {
      // Fetch location data from Firebase
      const locSnap = await db.ref(`locations/${locationId}`).once("value");
      const loc = locSnap.val();

      if (!loc) {
        res.status(404).json({ error: `Location ${locationId} not found` });
        return;
      }

      // Fetch historical data
      const histSnap = await db.ref(`history-events/${locationId}/${targetYear}`).once("value");
      const histData = histSnap.val() || {};

      // Call Claude API
      const ANTHROPIC_API_KEY = functions.config().anthropic?.api_key;
      if (!ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key not configured. Run: firebase functions:config:set anthropic.api_key=YOUR_KEY");
      }

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(loc, histData, targetYear);
      const messages = buildMessages(userPrompt, photoBase64);

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages
        })
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        throw new Error(`Claude API error: ${err}`);
      }

      const claudeData = await claudeRes.json();
      const rawText = claudeData.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");

      const clean = rawText.replace(/```json/gi,"").replace(/```/g,"").trim();
      const mlScene = JSON.parse(clean);

      // Save reconstruction to Firebase
      const recRef = db.ref("reconstructions").push();
      await recRef.set({
        locationId,
        userId,
        year: targetYear,
        aframeScene: mlScene.scene || mlScene,
        mlConfidence: mlScene.scene?.metadata?.confidence || mlScene.metadata?.confidence || 0.8,
        isFallback: false,
        createdAt: admin.database.ServerValue.TIMESTAMP
      });

      // Update location scan count
      await db.ref(`locations/${locationId}/scanCount`).transaction(v => (v || 0) + 1);
      await db.ref(`locations/${locationId}/lastScanned`).set(admin.database.ServerValue.TIMESTAMP);

      // Update user stats
      if (userId !== "anonymous") {
        await db.ref(`users/${userId}/scansCompleted`).transaction(v => (v || 0) + 1);
        await db.ref(`users/${userId}/lastActive`).set(admin.database.ServerValue.TIMESTAMP);
      }

      res.json({
        success: true,
        reconstructionId: recRef.key,
        locationId,
        year: targetYear,
        scene: mlScene.scene || mlScene,
        generatedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error("Reconstruction error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        isFallback: true
      });
    }
  });

// ─────────────────────────────────────────────────
// 2. HTTP FUNCTION: Get location with history
//    GET /getLocationData?id=plaza_central
// ─────────────────────────────────────────────────
exports.getLocationData = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const locationId = req.query.id;
  if (!locationId) { res.status(400).json({ error: "id required" }); return; }

  try {
    const [locSnap, histSnap, recSnap] = await Promise.all([
      db.ref(`locations/${locationId}`).once("value"),
      db.ref(`history-events/${locationId}`).once("value"),
      db.ref("reconstructions").orderByChild("locationId").equalTo(locationId).limitToLast(5).once("value")
    ]);

    res.json({
      location: locSnap.val(),
      historicalEvents: histSnap.val() || {},
      recentReconstructions: recSnap.exists()
        ? Object.entries(recSnap.val()).map(([k,v]) => ({ id:k, ...v }))
        : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// 3. REALTIME TRIGGER: Log reconstruction events
// ─────────────────────────────────────────────────
exports.onNewReconstruction = functions.database
  .ref("/reconstructions/{recId}")
  .onCreate(async (snap, context) => {
    const data = snap.val();
    console.log(`New reconstruction: ${data.locationId} (${data.year}) by ${data.userId}`);

    // Update global stats
    await db.ref("stats/totalReconstructions").transaction(v => (v || 0) + 1);
    await db.ref(`stats/byLocation/${data.locationId}`).transaction(v => (v || 0) + 1);
    await db.ref(`stats/byYear/${data.year}`).transaction(v => (v || 0) + 1);

    return null;
  });

// ─────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are the Chrono-Vision ML Reconstruction Engine.
Analyze location data and generate a precise JSON scene for A-Frame WebVR.
Respond ONLY with valid JSON. No markdown, no backticks, no preamble.

Required JSON structure:
{
  "scene": {
    "sky": { "color":"#hex", "fog":bool, "timeOfDay":"noon" },
    "ground": { "color":"#hex", "texture":"grass|concrete|asphalt", "condition":"pristine|good", "width":200, "depth":200 },
    "ambientLight": { "color":"#fff", "intensity":0.6 },
    "directionalLight": { "color":"#fff", "intensity":0.8, "position":{"x":1,"y":2,"z":1} },
    "buildings": [{ "id":"b1","type":"commercial","position":{"x":0,"y":5,"z":-20},"scale":{"x":8,"y":10,"z":8},"color":"#hex","windowColor":"#hex","condition":"pristine","hasRoof":true,"details":"string" }],
    "vegetation": [{ "id":"t1","type":"tree","position":{"x":0,"y":0,"z":-10},"scale":{"x":2,"y":4,"z":2},"color":"#228B22","health":1.0 }],
    "props": [{ "id":"p1","type":"fountain|bench|lamppost|vehicle|statue","position":{"x":0,"y":0,"z":-8},"scale":{"x":1,"y":1,"z":1},"color":"#hex","active":true }],
    "roads": [{ "id":"r1","direction":"horizontal|vertical","position":{"x":0,"y":0.01,"z":0},"width":8,"length":100,"color":"#333","hasMarkings":true }],
    "atmosphere": { "particlesEnabled":false,"particleType":"none","soundscape":[],"population":"medium","era":2010 },
    "metadata": { "locationName":"string","year":2010,"confidence":0.85,"reconstructionNotes":"string","keyFeatures":[] }
  }
}`;
}

function buildUserPrompt(loc, hist, year) {
  return `RECONSTRUCT: ${loc.name} — YEAR ${year}

CURRENT STATE: ${loc.description || 'Ruined urban location'}

HISTORICAL DATA:
${JSON.stringify(hist, null, 2)}

Generate a vivid, historically accurate A-Frame scene for ${year} with:
- 4-6 era-appropriate buildings
- 3-6 vegetation items  
- 4-8 props (street furniture, vehicles, etc.)
- Proper road layout
- Era-accurate colors and lighting

Respond ONLY with JSON.`;
}

function buildMessages(prompt, photoBase64) {
  if (!photoBase64) {
    return [{ role: "user", content: prompt }];
  }
  return [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photoBase64 } },
      { type: "text", text: `Analyze this ruined location photo to understand original scale and structure.\n\n${prompt}` }
    ]
  }];
}
