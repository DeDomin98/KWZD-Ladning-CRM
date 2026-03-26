// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyASV3xQoNf19LXv7GLyqqIjLj3LgjXms9A",
    authDomain: "wyjscie-z-dlugow.firebaseapp.com",
    projectId: "wyjscie-z-dlugow",
    storageBucket: "wyjscie-z-dlugow.firebasestorage.app",
    messagingSenderId: "840786449060",
    appId: "1:840786449060:web:ea4ab3beb0d0feac3b4c31",
    measurementId: "G-0M08YVKWKH"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);

// Funkcja pomocnicza do uzyskania URL funkcji Firebase
// Automatycznie obsługuje zarówno lokalny emulator jak i produkcyjne środowisko
export const getFunctionUrl = (functionName) => {
  const region = 'us-central1'; // Region funkcji Firebase
  const projectId = firebaseConfig.projectId;
  
  // Sprawdź czy używamy emulatora lokalnego
  if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
    // URL dla emulatora lokalnego (jeśli używasz Firebase Emulator Suite)
    // Odkomentuj poniższą linię jeśli chcesz testować lokalnie:
    // return `http://localhost:5001/${projectId}/${region}/${functionName}`;
  }
  
  // URL produkcyjny - automatycznie generowany na podstawie projektu i regionu
  // Format: https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
};