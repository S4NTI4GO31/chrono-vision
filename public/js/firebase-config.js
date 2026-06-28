// firebase-config.js — Chrono-Vision Firebase Setup
// Replace with your actual Firebase project credentials

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "// TODO: Agregar clave desde entorno seguro",
  authDomain: "chrono-vision-app-7c3a4.firebaseapp.com",
  projectId: "chrono-vision-app-7c3a4",
  storageBucket: "chrono-vision-app-7c3a4.firebasestorage.app",
  messagingSenderId: "120229345766",
  appId: "1:120229345766:web:e6c753ad4e4b9d4f347e27",
  measurementId: "G-B8CL0ZVBRP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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
