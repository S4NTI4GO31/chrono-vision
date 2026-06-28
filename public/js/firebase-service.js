// firebase-service.js — Chrono-Vision Firebase CRUD operations
// Handles: locations, reconstructions, users, history-events

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getDatabase, ref, set, get, push, onValue, update
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

let app, db, storage;

export function initFirebase() {
  app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  storage = getStorage(app);
  console.log("✅ Firebase initialized");
  return { app, db, storage };
}

// ─────────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────────
export async function saveLocation(locationId, data) {
  const locRef = ref(db, `locations/${locationId}`);
  await update(locRef, {
    ...data,
    lastScanned: Date.now()
  });
}

export async function getLocation(locationId) {
  const snap = await get(ref(db, `locations/${locationId}`));
  return snap.exists() ? snap.val() : null;
}

export function watchLocations(callback) {
  return onValue(ref(db, "locations"), snap => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// ─────────────────────────────────────────────
// RECONSTRUCTIONS — Save ML output
// ─────────────────────────────────────────────
export async function saveReconstruction(locationId, userId, mlData) {
  const recsRef = ref(db, "reconstructions");
  const newRef = await push(recsRef, {
    locationId,
    userId: userId || "anonymous",
    year: mlData.year,
    aframeScene: mlData.scene,
    mlConfidence: mlData.scene?.metadata?.confidence || 0,
    isFallback: mlData.isFallback || false,
    createdAt: Date.now()
  });
  return newRef.key;
}

export async function getReconstruction(reconstructionId) {
  const snap = await get(ref(db, `reconstructions/${reconstructionId}`));
  return snap.exists() ? snap.val() : null;
}

export async function getLocationReconstructions(locationId) {
  const snap = await get(ref(db, "reconstructions"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]) => v.locationId === locationId)
    .map(([k, v]) => ({ id: k, ...v }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ─────────────────────────────────────────────
// PHOTO UPLOAD to Firebase Storage
// ─────────────────────────────────────────────
export async function uploadPhoto(locationId, base64Data, mimeType = "image/jpeg") {
  const photoRef = storageRef(storage, `locations/${locationId}/scan_${Date.now()}.jpg`);
  await uploadString(photoRef, base64Data, "base64", { contentType: mimeType });
  const url = await getDownloadURL(photoRef);

  // Update location record with photo URL
  await update(ref(db, `locations/${locationId}`), { currentPhotoUrl: url });
  return url;
}

// ─────────────────────────────────────────────
// HISTORY EVENTS
// ─────────────────────────────────────────────
export async function saveHistoryEvent(locationId, year, eventData) {
  await set(ref(db, `history-events/${locationId}/${year}`), {
    ...eventData,
    createdAt: Date.now()
  });
}

export async function getHistoryEvents(locationId) {
  const snap = await get(ref(db, `history-events/${locationId}`));
  return snap.exists() ? snap.val() : {};
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export async function updateUserProgress(userId, data) {
  await update(ref(db, `users/${userId}`), {
    ...data,
    lastActive: Date.now()
  });
}

export async function getUserStats(userId) {
  const snap = await get(ref(db, `users/${userId}`));
  return snap.exists() ? snap.val() : { scansCompleted: 0, favoritePlaces: [] };
}

export async function incrementUserScans(userId) {
  const stats = await getUserStats(userId);
  await updateUserProgress(userId, {
    scansCompleted: (stats.scansCompleted || 0) + 1
  });
}

// ─────────────────────────────────────────────
// SEED INITIAL DATA (run once)
// ─────────────────────────────────────────────
export async function seedDatabase(locationsDataset) {
  const snap = await get(ref(db, "locations"));
  if (snap.exists()) {
    console.log("Database already seeded.");
    return;
  }
  for (const loc of locationsDataset) {
    await set(ref(db, `locations/${loc.id}`), {
      name: loc.name,
      description: loc.description,
      currentState: loc.currentState,
      coordinates: loc.coordinates,
      scanCount: 0,
      lastScanned: null,
      currentPhotoUrl: null
    });
    // Seed history events
    for (const [yearKey, data] of Object.entries(loc.historicalData)) {
      const year = yearKey.replace("year", "");
      await saveHistoryEvent(loc.id, year, {
        title: `${loc.name} en ${year}`,
        description: data.description,
        atmosphere: data.atmosphere,
        architecture: data.architecture,
        tags: [data.atmosphere, data.architecture].filter(Boolean)
      });
    }
  }
  console.log("✅ Database seeded with", locationsDataset.length, "locations");
}
