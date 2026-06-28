// ml-model.js — Chrono-Vision ML Reconstruction Engine
// Uses Claude (claude-sonnet-4-6) as the ML model to analyze photos
// and reconstruct historical A-Frame scenes as JSON

import { LOCATIONS_DATASET } from '../../dataset/locations.js';

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// ─────────────────────────────────────────────
// MAIN: Analyze photo + location → A-Frame JSON
// ─────────────────────────────────────────────
export async function reconstructLocation({ photoBase64, locationId, targetYear = 2010 }) {
  const location = LOCATIONS_DATASET.find(l => l.id === locationId);
  if (!location) throw new Error(`Location "${locationId}" not found in dataset`);

  const historicalData = location.historicalData[`year${targetYear}`]
    || Object.values(location.historicalData)[0];

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(location, historicalData, targetYear);

  const messages = photoBase64
    ? buildMessagesWithImage(userPrompt, photoBase64)
    : buildMessagesTextOnly(userPrompt);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();

    const rawText = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    return parseMLResponse(rawText, location, targetYear);
  } catch (err) {
    console.error("ML reconstruction failed:", err);
    // Fallback: use template from dataset
    return buildFallbackScene(location, historicalData, targetYear);
  }
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT — instructs Claude as ML model
// ─────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are the Chrono-Vision ML Reconstruction Engine. 
Your job is to analyze a photo of a ruined city location and historical metadata, 
then generate a precise JSON object that describes how to reconstruct that location 
in A-Frame (WebVR) as it looked in a specific historical year.

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation.

The JSON must follow this exact schema:
{
  "scene": {
    "sky": {
      "color": "#hex",
      "fog": boolean,
      "fogColor": "#hex",
      "fogDensity": 0.0-0.05,
      "timeOfDay": "morning|noon|evening|night"
    },
    "ground": {
      "color": "#hex",
      "texture": "grass|concrete|stone|asphalt|dirt",
      "condition": "pristine|good|worn",
      "width": number,
      "depth": number
    },
    "ambientLight": {
      "color": "#hex",
      "intensity": 0.0-2.0
    },
    "directionalLight": {
      "color": "#hex",
      "intensity": 0.0-2.0,
      "position": { "x": number, "y": number, "z": number }
    },
    "buildings": [
      {
        "id": "building_1",
        "type": "commercial|residential|industrial|civic|landmark",
        "position": { "x": number, "y": number, "z": number },
        "scale": { "x": number, "y": number, "z": number },
        "color": "#hex",
        "windowColor": "#hex",
        "condition": "pristine|good|worn",
        "hasRoof": boolean,
        "details": "brief description"
      }
    ],
    "vegetation": [
      {
        "id": "tree_1",
        "type": "tree|bush|flower|grass_patch",
        "position": { "x": number, "y": number, "z": number },
        "scale": { "x": number, "y": number, "z": number },
        "color": "#hex",
        "health": 0.0-1.0
      }
    ],
    "props": [
      {
        "id": "prop_1",
        "type": "fountain|bench|lamppost|sign|vehicle|statue|trash_can",
        "position": { "x": number, "y": number, "z": number },
        "scale": { "x": number, "y": number, "z": number },
        "color": "#hex",
        "active": boolean
      }
    ],
    "roads": [
      {
        "id": "road_1",
        "direction": "horizontal|vertical",
        "position": { "x": number, "y": number, "z": number },
        "width": number,
        "length": number,
        "color": "#hex",
        "hasMarkings": boolean
      }
    ],
    "atmosphere": {
      "particlesEnabled": boolean,
      "particleType": "none|dust|leaves|snow|rain",
      "soundscape": ["ambient_city", "wind", "water", "birds", "traffic", "machinery"],
      "population": "empty|sparse|medium|dense",
      "era": number
    },
    "metadata": {
      "locationName": "string",
      "year": number,
      "confidence": 0.0-1.0,
      "reconstructionNotes": "string",
      "keyFeatures": ["string"]
    }
  }
}`;
}

// ─────────────────────────────────────────────
// USER PROMPT — injects location + historical data
// ─────────────────────────────────────────────
function buildUserPrompt(location, historicalData, targetYear) {
  return `RECONSTRUCT THIS LOCATION FOR YEAR ${targetYear}:

LOCATION: ${location.name}
LOCATION ID: ${location.id}
CURRENT STATE (2077): ${location.description}

HISTORICAL DATA FOR ${targetYear}:
- Description: ${historicalData.description}
- Atmosphere: ${historicalData.atmosphere}
- Architecture: ${historicalData.architecture}
- Vegetation: ${historicalData.vegetation}
- Infrastructure: ${historicalData.infrastructure}
- Sounds: ${historicalData.sounds.join(', ')}
- Sky color reference: ${historicalData.skyColor}
- Building condition: ${historicalData.buildingCondition}
- Population density: ${historicalData.population}

CURRENT A-FRAME BASE STRUCTURE (ruins):
${JSON.stringify(location.aframeTemplate, null, 2)}

TASK: Generate the A-Frame JSON scene for how this location looked in ${targetYear}.
- Create 3-6 buildings appropriate to the historical era
- Add 2-5 vegetation items matching the historical description
- Include 3-8 props (street furniture, vehicles, etc.) typical of ${targetYear}
- Set lighting and sky to match the atmosphere
- Make buildings pristine/good condition (not ruined)
- Use historically accurate colors for the era
- Set confidence based on how complete the historical data is

Respond ONLY with the JSON object.`;
}

function buildMessagesWithImage(userPrompt, photoBase64) {
  return [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: photoBase64
        }
      },
      {
        type: "text",
        text: `PHOTO ANALYSIS: Analyze this photo of the current ruined state to understand the original structure and scale.\n\n${userPrompt}`
      }
    ]
  }];
}

function buildMessagesTextOnly(userPrompt) {
  return [{
    role: "user",
    content: userPrompt
  }];
}

// ─────────────────────────────────────────────
// PARSE + VALIDATE ML response
// ─────────────────────────────────────────────
function parseMLResponse(rawText, location, targetYear) {
  try {
    // Strip any accidental markdown
    const clean = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(clean);

    // Validate required fields
    if (!parsed.scene) throw new Error("Missing 'scene' in ML response");
    if (!parsed.scene.buildings) throw new Error("Missing 'buildings' in ML response");

    console.log(`✅ ML Reconstruction successful for ${location.name} (${targetYear})`);
    console.log(`   Confidence: ${parsed.scene.metadata?.confidence || 'N/A'}`);

    return {
      success: true,
      locationId: location.id,
      locationName: location.name,
      year: targetYear,
      scene: parsed.scene,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("Failed to parse ML response, using fallback:", err.message);
    const historicalData = location.historicalData[`year${targetYear}`]
      || Object.values(location.historicalData)[0];
    return buildFallbackScene(location, historicalData, targetYear);
  }
}

// ─────────────────────────────────────────────
// FALLBACK SCENE from dataset template
// ─────────────────────────────────────────────
function buildFallbackScene(location, historicalData, targetYear) {
  const template = location.aframeTemplate;
  return {
    success: true,
    locationId: location.id,
    locationName: location.name,
    year: targetYear,
    isFallback: true,
    scene: {
      sky: {
        color: historicalData?.skyColor || "#87CEEB",
        fog: false,
        fogColor: "#ffffff",
        fogDensity: 0.01,
        timeOfDay: "noon"
      },
      ground: {
        color: "#5C7A3E",
        texture: "grass",
        condition: "pristine",
        width: 200,
        depth: 200
      },
      ambientLight: { color: "#ffffff", intensity: 0.6 },
      directionalLight: {
        color: "#ffffff",
        intensity: 0.8,
        position: { x: 1, y: 2, z: 1 }
      },
      buildings: template.buildings.map((b, i) => ({
        id: `building_${i + 1}`,
        type: "commercial",
        position: {
          x: parseFloat(b.position.split(" ")[0]),
          y: parseFloat(b.position.split(" ")[1]),
          z: parseFloat(b.position.split(" ")[2])
        },
        scale: {
          x: parseFloat(b.scale.split(" ")[0]),
          y: parseFloat(b.scale.split(" ")[1]),
          z: parseFloat(b.scale.split(" ")[2])
        },
        color: "#D4C5A9",
        windowColor: "#87CEEB",
        condition: historicalData?.buildingCondition || "good",
        hasRoof: true,
        details: `Historical building from ${targetYear}`
      })),
      vegetation: Array(historicalData?.vegetation?.includes("alta") ? 8 : 3)
        .fill(null)
        .map((_, i) => ({
          id: `tree_${i + 1}`,
          type: "tree",
          position: {
            x: (Math.random() - 0.5) * 30,
            y: 0,
            z: -10 - Math.random() * 20
          },
          scale: { x: 2, y: 4, z: 2 },
          color: "#228B22",
          health: 1.0
        })),
      props: [
        {
          id: "prop_fountain",
          type: "fountain",
          position: { x: 0, y: 0.5, z: -10 },
          scale: { x: 2, y: 1.5, z: 2 },
          color: "#C0C0C0",
          active: true
        },
        {
          id: "prop_lamp_1",
          type: "lamppost",
          position: { x: -5, y: 0, z: -8 },
          scale: { x: 0.3, y: 5, z: 0.3 },
          color: "#4A4A4A",
          active: true
        }
      ],
      roads: [
        {
          id: "road_main",
          direction: "horizontal",
          position: { x: 0, y: 0.01, z: 0 },
          width: 8,
          length: 100,
          color: "#333333",
          hasMarkings: true
        }
      ],
      atmosphere: {
        particlesEnabled: false,
        particleType: "none",
        soundscape: historicalData?.sounds || ["ambient_city"],
        population: "medium",
        era: targetYear
      },
      metadata: {
        locationName: location.name,
        year: targetYear,
        confidence: 0.6,
        reconstructionNotes: "Fallback reconstruction from dataset template",
        keyFeatures: [historicalData?.architecture || "urban architecture"]
      }
    },
    generatedAt: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────
// Get all available locations for the UI
// ─────────────────────────────────────────────
export function getAvailableLocations() {
  return LOCATIONS_DATASET.map(l => ({
    id: l.id,
    name: l.name,
    description: l.description,
    availableYears: Object.keys(l.historicalData).map(k => parseInt(k.replace("year", "")))
  }));
}
