// ===== FIREBASE WEB CONFIG — the ONLY file you need to edit =====
// Firebase console > gear icon > Project settings > General > "Your apps" > Web app (</>) > SDK setup and configuration > Config.
// Values below were copied from your Firebase console. If you have no web app yet, click "Add app" (</>) to register one.
// These web values identify your project; they are not secrets. Real protection = Authentication + Database Rules.
// NEVER put a service-account key or any password in this file.
export const firebaseConfig = {
  apiKey: "AIzaSyBYEaiV5lT6Ks-7duvVmqkI-f5dx4SZHX0",
  authDomain: "microplanting.firebaseapp.com",
  databaseURL: "https://microplanting-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "microplanting",
  storageBucket: "microplanting.firebasestorage.app",
  messagingSenderId: "226059883747",
  appId: "1:226059883747:web:918aee96c5c4d096c1a1d6",
  measurementId: "G-KH033QBPC7"   // unused: Analytics is not loaded
};
const REQUIRED = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
export const missingFields = (c = firebaseConfig) =>
  REQUIRED.filter(k => typeof c[k] !== "string" || c[k].trim() === "" || /^(PASTE|YOUR|TODO)/i.test(c[k].trim()));
