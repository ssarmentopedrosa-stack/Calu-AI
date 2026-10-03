import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
  updateProfile,
  User as FirebaseUser,
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

export class AuthService {
  private static currentUser: AuthSessionUser | null = null;
  private static listeners: Array<(user: AuthSessionUser | null) => void> = [];

  static init() {
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
      // Offline/Local Development mode with persistent real UID
      try {
        const saved = localStorage.getItem(LOCAL_SESSION_KEY);
        if (saved) {
          this.currentUser = JSON.parse(saved);
        } else {
          // Create initial local user with real unique UID
          const localUid = 'usr_' + Math.random().toString(36).substring(2, 10);
          this.currentUser = {
            uid: localUid,
            email: 'usuario.local@calu.ai',
            displayName: 'Usuário Calu',
            photoURL: null,
            isAnonymous: false,
          };
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(this.currentUser));
        }
      } catch {
        this.currentUser = {
          uid: 'usr_default_local',
          email: null,
          displayName: 'Usuário',
          photoURL: null,
          isAnonymous: false,
        };
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

  static async getIdToken(): Promise<string | null> {
    if (isFirebaseConfigured && auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    // For local development, return simulated secure token carrying UID
    return this.currentUser ? `local_dev_token_${this.currentUser.uid}` : null;
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

    // Local fallback
    const user: AuthSessionUser = {
      uid: 'google_' + Math.random().toString(36).substring(2, 10),
      email: 'usuario.google@exemplo.com',
      displayName: 'Usuário Google',
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

    // Local fallback
    const user: AuthSessionUser = {
      uid: 'email_' + Math.random().toString(36).substring(2, 10),
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

    // Local fallback
    const user: AuthSessionUser = {
      uid: 'acc_' + Math.random().toString(36).substring(2, 10),
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

  static async signOut(): Promise<void> {
    if (isFirebaseConfigured) {
      await fbSignOut(auth);
    }
    this.currentUser = null;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    this.notifyListeners();
  }

  static async deleteAccount(): Promise<void> {
    if (isFirebaseConfigured && auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
    this.currentUser = null;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    this.notifyListeners();
  }
}
