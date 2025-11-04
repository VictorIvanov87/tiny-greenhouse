import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app: App | null = null;

export function ensureFirebase() {
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials in ENV');
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    const credentials = cert({
      projectId,
      clientEmail,
      privateKey,
    });

    app = initializeApp({ credential: credentials });
  }

  return {
    auth: getAuth(),
  };
}
