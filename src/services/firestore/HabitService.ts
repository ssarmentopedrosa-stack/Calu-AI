import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { HabitState } from '../../types';

export const DEFAULT_CLEAN_HABITS: HabitState = {
  waterGoalMet: 'not_recorded',
  fruitVeggieMet: 'not_recorded',
  threeMealsMet: 'not_recorded',
  exerciseMet: 'not_recorded',
  goodSleepMet: 'not_recorded',
};

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryHabits = new Map<string, Record<string, HabitState>>();

export class HabitService {
  /**
   * Retrieves habit status for a specific local date from Firestore
   */
  static async getHabits(uid: string, date: string): Promise<HabitState> {
    if (!uid) return DEFAULT_CLEAN_HABITS;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/habits/${date}`;
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'habits', date));
        if (snap.exists()) {
          return snap.data() as HabitState;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    const userMap = inMemoryHabits.get(uid) || {};
    return userMap[date] || DEFAULT_CLEAN_HABITS;
  }

  /**
   * Saves habit state for a specific date to Firestore
   */
  static async saveHabits(uid: string, date: string, habits: HabitState): Promise<void> {
    if (!uid) return;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/habits/${date}`;
      try {
        await setDoc(doc(db, 'users', uid, 'habits', date), habits, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const userMap = inMemoryHabits.get(uid) || {};
      userMap[date] = habits;
      inMemoryHabits.set(uid, userMap);
    }
  }
}
