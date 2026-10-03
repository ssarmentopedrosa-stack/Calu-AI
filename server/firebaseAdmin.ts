import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import dotenv from 'dotenv';

dotenv.config();

let adminApp: App | null = null;

export function initFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);

  if (projectId && clientEmail && rawPrivateKey) {
    try {
      const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
      console.log(`[Firebase Admin] Inicializado com sucesso para o projeto: ${projectId}`);
      return adminApp;
    } catch (err: any) {
      console.error('[Firebase Admin] Falha ao inicializar com credenciais do Service Account:', err.message);
      return null;
    }
  }

  // Fallback to Application Default Credentials (e.g. running on Google Cloud Run or GCP environment)
  if (projectId) {
    try {
      adminApp = initializeApp({
        projectId,
        storageBucket,
      });
      console.log(`[Firebase Admin] Inicializado via Application Default Credentials (ADC) para: ${projectId}`);
      return adminApp;
    } catch (err: any) {
      console.warn('[Firebase Admin] Inicialização via ADC indisponível:', err.message);
      return null;
    }
  }

  console.warn('[Firebase Admin] Variáveis de ambiente FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY não configuradas.');
  return null;
}

// Auto-initialize on import
initFirebaseAdmin();

export const isFirebaseAdminReady = (): boolean => {
  return getApps().length > 0;
};

export const getAdminAuth = (): Auth => {
  if (!isFirebaseAdminReady()) {
    initFirebaseAdmin();
  }
  const app = getApps()[0] || adminApp;
  if (!app) {
    throw new Error('Firebase Admin App não foi inicializado.');
  }
  return getAuth(app);
};

export const getAdminDb = (): Firestore => {
  if (!isFirebaseAdminReady()) {
    initFirebaseAdmin();
  }
  const app = getApps()[0] || adminApp;
  if (!app) {
    throw new Error('Firebase Admin App não foi inicializado.');
  }
  return getFirestore(app);
};

export const getAdminStorage = (): Storage => {
  if (!isFirebaseAdminReady()) {
    initFirebaseAdmin();
  }
  const app = getApps()[0] || adminApp;
  if (!app) {
    throw new Error('Firebase Admin App não foi inicializado.');
  }
  return getStorage(app);
};

export { FieldValue };
export default {
  initFirebaseAdmin,
  isFirebaseAdminReady,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
};
