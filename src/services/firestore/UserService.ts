import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, NutritionGoals } from '../../types';
import { DateService } from '../dateService';

export const DEFAULT_INITIAL_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 120,
  carbohydrates: 230,
  fat: 65,
  fiber: 28,
  waterMl: 2500,
};

export const createCleanProfile = (uid: string, name = 'Usuário', email?: string): UserProfile => ({
  uid,
  name,
  email,
  age: 28,
  gender: 'prefiro_nao_dizer',
  heightCm: 170,
  weightKg: 70,
  activityLevel: 'moderado',
  goal: 'melhorar_habitos',
  dietaryPreference: 'livre',
  plan: 'free',
  onboardingCompleted: false,
  createdAt: DateService.getLocalDateTime(),
  updatedAt: DateService.getLocalDateTime(),
});

export class UserService {
  static async getProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/preferences/profile`;
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'preferences', 'profile'));
        if (snap.exists()) {
          return snap.data() as UserProfile;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    // Local fallback for offline/demo
    try {
      const local = localStorage.getItem(`calu_v2_profile_${uid}`);
      return local ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  }

  static async saveProfile(profile: UserProfile): Promise<void> {
    const updated = {
      ...profile,
      updatedAt: DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${profile.uid}/preferences/profile`;
      try {
        await setDoc(doc(db, 'users', profile.uid, 'preferences', 'profile'), updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Keep temporary non-critical local cache
    try {
      localStorage.setItem(`calu_v2_profile_${profile.uid}`, JSON.stringify(updated));
    } catch {}
  }

  static async getGoals(uid: string): Promise<NutritionGoals> {
    if (!uid) return DEFAULT_INITIAL_GOALS;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/goals/current`;
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'goals', 'current'));
        if (snap.exists()) {
          return snap.data() as NutritionGoals;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    try {
      const local = localStorage.getItem(`calu_v2_goals_${uid}`);
      return local ? JSON.parse(local) : DEFAULT_INITIAL_GOALS;
    } catch {
      return DEFAULT_INITIAL_GOALS;
    }
  }

  static async saveGoals(uid: string, goals: NutritionGoals): Promise<void> {
    const updated = {
      ...goals,
      updatedAt: DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${uid}/goals/current`;
      try {
        await setDoc(doc(db, 'users', uid, 'goals', 'current'), updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    try {
      localStorage.setItem(`calu_v2_goals_${uid}`, JSON.stringify(updated));
    } catch {}
  }
}
