import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Placeholder values that indicate config is not set
const PLACEHOLDER_VALUES = new Set([
  'placeholder-api-key',
  'placeholder-project.firebaseapp.com',
  'placeholder-project',
  'placeholder-project.appspot.com',
  '000000000000',
  '1:000000000000:web:0000000000000000000000',
  'your-api-key',
  'your-project.firebaseapp.com',
  'your-project-id',
  'your-project.appspot.com',
  'your-sender-id',
  'your-app-id',
  '',
]);

function validateConfig(): { valid: boolean; missing: string[]; placeholder: string[] } {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  
  const missing = required.filter(key => !import.meta.env[key]);
  const placeholder = required.filter(key => PLACEHOLDER_VALUES.has(import.meta.env[key]));
  
  return { valid: missing.length === 0 && placeholder.length === 0, missing, placeholder };
}

const validation = validateConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (validation.valid) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  
  setPersistence(auth, browserLocalPersistence).catch((err: unknown) => {
    console.warn('Failed to set auth persistence:', err);
  });
} else {
  const messages: string[] = [];
  if (validation.missing.length > 0) {
    messages.push(`Missing required Firebase config: ${validation.missing.join(', ')}`);
  }
  if (validation.placeholder.length > 0) {
    messages.push(`Firebase config contains placeholder values: ${validation.placeholder.join(', ')}. Please set real values in .env.local`);
  }
  console.warn(messages.join('\n'));
}

export { app, auth };
export const isFirebaseConfigured = validation.valid;

export const validationErrors = validation.missing.length > 0 
  ? `Missing: ${validation.missing.join(', ')}`
  : validation.placeholder.length > 0
    ? `Placeholder values detected: ${validation.placeholder.join(', ')}`
    : null;

export const demoEmail = import.meta.env.VITE_DEMO_EMAIL || '';
export const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || '';