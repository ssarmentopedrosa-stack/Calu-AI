import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { DateService } from '../dateService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryInsights = new Map<string, Record<string, string>>();

export class InsightService {
  /**
   * Retrieves cached daily insight for user for a specific date
   */
  static async getDailyInsight(uid: string, date: string): Promise<string | null> {
    if (!uid || !date) return null;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/insights/${date}`;
      try {
        const docRef = doc(db, 'users', uid, 'insights', date);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.insight === 'string' && data.insight.trim().length > 0) {
            return data.insight;
          }
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
        return null;
      }
    }

    const userMap = inMemoryInsights.get(uid);
    return userMap ? userMap[date] || null : null;
  }

  /**
   * Saves daily insight to cache at users/{uid}/insights/{date}
   */
  static async saveDailyInsight(uid: string, date: string, insight: string): Promise<void> {
    if (!uid || !date || !insight) return;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/insights/${date}`;
      try {
        const docRef = doc(db, 'users', uid, 'insights', date);
        await setDoc(
          docRef,
          {
            date,
            insight,
            createdAt: DateService.getLocalDateTime(),
            updatedAt: DateService.getLocalDateTime(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const userMap = inMemoryInsights.get(uid) || {};
      userMap[date] = insight;
      inMemoryInsights.set(uid, userMap);
    }
  }
}
