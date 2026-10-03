import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

const LOCAL_SESSION_KEY = 'calu_auth_local_session_v2';
const isProduction = import.meta.env.PROD;
const isDemoModeExplicit = import.meta.env.VITE_DEMO_MODE === 'true';

export class AuthService {
  private static currentUser: AuthSessionUser | null = null;
  private static listeners: Array<(user: AuthSessionUser | null) => void> = [];
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    if (isFirebaseConfigured) {
      onAuthStateChanged(auth, async fbUser => {
        if (fbUser) {
          this.currentUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            isAnonymous: fbUser.isAnonymous,
          };
        } else {
          this.currentUser = null;
        }
        this.notifyListeners();
      });
    } else {
      // In production, fake authentication is strictly forbidden (Anti-bypass)
      if (isProduction) {
        console.error('[AuthService] Firebase não configurado em ambiente de produção.');
        this.currentUser = null;
        this.notifyListeners();
        return;
      }

      // In local dev ONLY when demo mode is explicit
      if (isDemoModeExplicit) {
        try {
          const saved = localStorage.getItem(LOCAL_SESSION_KEY);
          if (saved) {
            this.currentUser = JSON.parse(saved);
          } else {
            const devUid = 'demo_user_authenticated_dev';
            this.currentUser = {
              uid: devUid,
              email: 'demo@calu.ai',
              displayName: 'Usuário Demonstração',
              photoURL: null,
              isAnonymous: false,
            };
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(this.currentUser));
          }
        } catch {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
      this.notifyListeners();
    }
  }

  static onAuthStateChanged(cb: (user: AuthSessionUser | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private static notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    }
  }

  static getCurrentUser(): AuthSessionUser | null {
    return this.currentUser;
  }

  static async getIdToken(forceRefresh = false): Promise<string | null> {
    if (isFirebaseConfigured && auth.currentUser) {
      return await auth.currentUser.getIdToken(forceRefresh);
    }

    // In production, never return mock tokens
    if (isProduction) {
      return null;
    }

    if (isDemoModeExplicit && this.currentUser) {
      return 'demo_dev_token';
    }

    return null;
  }

  static async signInWithGoogle(): Promise<AuthSessionUser> {
    if (isFirebaseConfigured) {
      const cred = await signInWithPopup(auth, googleProvider);
      const user: AuthSessionUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        isAnonymous: cred.user.isAnonymous,
      };
      this.currentUser = user;
      this.notifyListeners();
      return user;
    }

    if (isProduction) {
      throw new Error('Firebase Authentication não está configurado neste ambiente.');
    }

    if (!isDemoModeExplicit) {
      throw new Error('Configure o Firebase para habilitar login com Google.');
    }

    const user: AuthSessionUser = {
      uid: 'demo_user_authenticated_dev',
      email: 'demo@calu.ai',
      displayName: 'Usuário Demonstração',
      photoURL: null,
      isAnonymous: false,
    };
    this.currentUser = user;
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  static async signInWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
    if (isFirebaseConfigured) {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user: AuthSessionUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        isAnonymous: cred.user.isAnonymous,
      };
      this.currentUser = user;
      this.notifyListeners();
      return user;
    }

    if (isProduction) {
      throw new Error('Firebase Authentication não está configurado.');
    }

    if (!isDemoModeExplicit) {
      throw new Error('Configure o Firebase para habilitar login com e-mail.');
    }

    const user: AuthSessionUser = {
      uid: 'demo_user_authenticated_dev',
      email,
      displayName: email.split('@')[0],
      photoURL: null,
      isAnonymous: false,
    };
    this.currentUser = user;
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  static async createAccount(email: string, pass: string, displayName: string): Promise<AuthSessionUser> {
    if (isFirebaseConfigured) {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      const user: AuthSessionUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || cred.user.displayName,
        photoURL: cred.user.photoURL,
        isAnonymous: cred.user.isAnonymous,
      };
      this.currentUser = user;
      this.notifyListeners();
      return user;
    }

    if (isProduction) {
      throw new Error('Firebase Authentication não está configurado.');
    }

    if (!isDemoModeExplicit) {
      throw new Error('Configure o Firebase para habilitar cadastro.');
    }

    const user: AuthSessionUser = {
      uid: 'demo_user_authenticated_dev',
      email,
      displayName: displayName || email.split('@')[0],
      photoURL: null,
      isAnonymous: false,
    };
    this.currentUser = user;
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  static async sendPasswordReset(email: string): Promise<void> {
    if (isFirebaseConfigured) {
      await sendPasswordResetEmail(auth, email);
    } else {
      throw new Error('Firebase Authentication não configurado.');
    }
  }

  static async signOut(): Promise<void> {
    if (isFirebaseConfigured) {
      await fbSignOut(auth);
    }
    this.currentUser = null;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    this.notifyListeners();
  }

  static async deleteAccount(): Promise<void> {
    // Also trigger server-side cascade
    const token = await this.getIdToken();
    if (token) {
      try {
        await fetch('/api/user/delete-account', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err: any) {
        console.warn('Erro na exclusão server-side:', err.message);
      }
    }

    if (isFirebaseConfigured && auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    this.currentUser = null;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    this.notifyListeners();
  }
}
