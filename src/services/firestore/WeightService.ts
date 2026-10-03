import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { WeightLog } from '../../types';
import { DateService } from '../dateService';
import { UserService } from './UserService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryWeightLogs = new Map<string, WeightLog[]>();

export class WeightService {
  /**
   * Retrieves weight logs chronologically from Firestore
   */
  static async getWeights(uid: string): Promise<WeightLog[]> {
    if (!uid) return [];

    if (isFirebaseConfigured) {
      const path = `users/${uid}/weightLogs`;
      try {
        const weightRef = collection(db, 'users', uid, 'weightLogs');
        const q = query(weightRef, orderBy('date', 'asc'));
        const snap = await getDocs(q);
        const list: WeightLog[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as WeightLog));
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    const list = inMemoryWeightLogs.get(uid) || [];
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Adds or updates a weight entry for a date in Firestore
   */
  static async addWeight(uid: string, weightKg: number, date: string, notes?: string): Promise<void> {
    if (!uid || weightKg <= 0) return;

    const log: WeightLog = {
      id: 'w_' + Date.now(),
      uid,
      weightKg,
      unit: 'kg',
      date,
      notes,
      createdAt: DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${uid}/weightLogs/${log.id}`;
      try {
        const docRef = doc(db, 'users', uid, 'weightLogs', log.id);
        await setDoc(docRef, log, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = inMemoryWeightLogs.get(uid) || [];
      const idx = list.findIndex(w => w.date === date);
      if (idx >= 0) {
        list[idx] = log;
      } else {
        list.push(log);
      }
      list.sort((a, b) => a.date.localeCompare(b.date));
      inMemoryWeightLogs.set(uid, list);
    }

    // Update weight in profile
    const profile = await UserService.getProfile(uid);
    if (profile) {
      profile.weightKg = weightKg;
      await UserService.saveProfile(profile);
    }
  }
}
