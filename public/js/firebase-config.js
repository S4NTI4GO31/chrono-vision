// firebase-config.js — Chrono-Vision Firebase Setup
// Replace with your actual Firebase project credentials

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "chrono-vision-app.firebaseapp.com",
  databaseURL: "https://chrono-vision-app-default-rtdb.firebaseio.com",
  projectId: "chrono-vision-app",
  storageBucket: "chrono-vision-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase Realtime Database Schema:
/*
chrono-vision/
  locations/
    {locationId}/
      name: string
      currentPhotoUrl: string
      lastScanned: timestamp
      scanCount: number
  
  reconstructions/
    {reconstructionId}/
      locationId: string
      userId: string
      year: number
      aframeScene: object       ← JSON generado por ML
      mlConfidence: number
      createdAt: timestamp
      imageAnalysis: object
  
  users/
    {userId}/
      displayName: string
      scansCompleted: number
      favoritePlaces: array
      lastActive: timestamp
  
  history-events/
    {locationId}/
      {year}/
        title: string
        description: string
        imageUrl: string
        tags: array
*/

export { FIREBASE_CONFIG };
