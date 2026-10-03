import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { WaterLog } from '../../types';
import { DateService } from '../dateService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryWaterLogs = new Map<string, WaterLog[]>();

export class WaterService {
  /**
   * Retrieves total water consumed in ml for a specific local date from Firestore
   */
  static async getWaterByDate(uid: string, date: string): Promise<number> {
    if (!uid) return 0;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/waterLogs`;
      try {
        const waterRef = collection(db, 'users', uid, 'waterLogs');
        const q = query(waterRef, where('date', '==', date));
        const snap = await getDocs(q);
        let total = 0;
        snap.forEach(docSnap => {
          const log = docSnap.data() as WaterLog;
          total += log.amountMl || 0;
        });
        return total;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    const logs = inMemoryWaterLogs.get(uid) || [];
    return logs.filter(l => l.date === date).reduce((acc, l) => acc + (l.amountMl || 0), 0);
  }

  /**
   * Adds a water entry (delta in ml) to Firestore
   */
  static async addWater(uid: string, date: string, deltaMl: number): Promise<number> {
    if (!uid || deltaMl <= 0) return await this.getWaterByDate(uid, date);

    const log: WaterLog = {
      id: 'water_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      uid,
      amountMl: deltaMl,
      date,
      timestamp: DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${uid}/waterLogs/${log.id}`;
      try {
        const docRef = doc(db, 'users', uid, 'waterLogs', log.id);
        await setDoc(docRef, log);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const logs = inMemoryWaterLogs.get(uid) || [];
      logs.push(log);
      inMemoryWaterLogs.set(uid, logs);
    }

    return await this.getWaterByDate(uid, date);
  }
}
