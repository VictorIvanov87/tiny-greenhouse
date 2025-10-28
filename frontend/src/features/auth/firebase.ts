import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (Object.values(firebaseConfig).some((value) => !value)) {
  throw new Error('Missing Firebase environment configuration. Check .env or .env.local values.')
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
