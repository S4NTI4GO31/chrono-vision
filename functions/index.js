const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Solo usamos Gemini

admin.initializeApp();
const db = admin.database();

// Inicializamos Gemini fuera de la función para mejor rendimiento (Cold Starts)
const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

exports.reconstructLocation = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const { locationId, targetYear = 2010, photoBase64, userId = "anonymous" } = req.body;

    try {
      // 1. Fetch de datos
      const [locSnap, histSnap] = await Promise.all([
        db.ref(`locations/${locationId}`).once("value"),
        db.ref(`history-events/${locationId}/${targetYear}`).once("value")
      ]);
      
      const loc = locSnap.val();
      if (!loc) return res.status(404).json({ error: "Location not found" });

      // 2. Preparar IA (Gemini)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = buildUserPrompt(loc, histSnap.val() || {}, targetYear);
      
      // 3. Generar contenido
      let promptParts = [buildSystemPrompt() + "\n\n" + prompt];
      if (photoBase64) {
          promptParts.unshift({
              inlineData: { data: photoBase64, mimeType: "image/jpeg" }
          });
      }

      const result = await model.generateContent(promptParts);
      const rawText = result.response.text();
      const clean = rawText.replace(/```json/gi,"").replace(/```/g,"").trim();
      const mlScene = JSON.parse(clean);

      // 4. Guardar en Firebase (resto de tu lógica de transacciones sigue igual)
      const recRef = db.ref("reconstructions").push();
      await recRef.set({
        locationId, userId, year: targetYear,
        aframeScene: mlScene.scene || mlScene,
        mlConfidence: mlScene.scene?.metadata?.confidence || 0.8,
        createdAt: admin.database.ServerValue.TIMESTAMP
      });

      res.json({ success: true, scene: mlScene.scene || mlScene });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  })
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
