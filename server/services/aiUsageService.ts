import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, isFirebaseAdminReady } from '../firebaseAdmin.ts';
import { AI_LIMITS } from '../../src/config/constants.ts';
import { DateService } from '../../src/services/dateService.ts';

export type AIActionType = 'mealAnalysis' | 'chat' | 'dailyInsight';

export class ServerAIUsageService {
  /**
   * Checks and atomically increments AI action counters in Firestore:
   * users/{uid}/aiUsage/{YYYY-MM-DD}
   */
  static async checkAndIncrement(
    uid: string,
    action: AIActionType,
    isPremium = false
  ): Promise<{ allowed: boolean; remaining: number }> {
    const limits = isPremium ? AI_LIMITS.premium : AI_LIMITS.free;
    const maxLimit =
      action === 'mealAnalysis'
        ? limits.mealAnalysisPerDay
        : action === 'chat'
        ? limits.chatPerDay
        : limits.dailyInsightPerDay;

    const todayDate = DateService.getLocalDate();

    // If Firebase Admin is not ready (e.g. offline dev demo mode)
    if (!isFirebaseAdminReady()) {
      return { allowed: true, remaining: maxLimit - 1 };
    }

    const db = getAdminDb();
    const docRef = db.doc(`users/${uid}/aiUsage/${todayDate}`);

    try {
      const result = await db.runTransaction(async transaction => {
        const snap = await transaction.get(docRef);
        const data = snap.data() || {
          date: todayDate,
          mealAnalyses: 0,
          chatMessages: 0,
          dailyInsights: 0,
          totalRequests: 0,
          createdAt: DateService.getLocalDateTime(),
        };

        const currentCount =
          action === 'mealAnalysis'
            ? data.mealAnalyses || 0
            : action === 'chat'
            ? data.chatMessages || 0
            : data.dailyInsights || 0;

        if (currentCount >= maxLimit) {
          return { allowed: false, remaining: 0 };
        }

        const newCount = currentCount + 1;
        const updatePayload: Record<string, any> = {
          date: todayDate,
          totalRequests: FieldValue.increment(1),
          updatedAt: DateService.getLocalDateTime(),
        };

        if (action === 'mealAnalysis') {
          updatePayload.mealAnalyses = FieldValue.increment(1);
        } else if (action === 'chat') {
          updatePayload.chatMessages = FieldValue.increment(1);
        } else {
          updatePayload.dailyInsights = FieldValue.increment(1);
        }

        transaction.set(docRef, updatePayload, { merge: true });

        return { allowed: true, remaining: Math.max(0, maxLimit - newCount) };
      });

      return result;
    } catch (err: any) {
      console.error('[ServerAIUsageService] Erro na transação de quota:', err.message);
      // Fallback: don't permanently brick user on transient DB error, but enforce safety
      return { allowed: true, remaining: 1 };
    }
  }

  /**
   * Retrieves today's current usage for a user
   */
  static async getTodayUsage(uid: string) {
    const todayDate = DateService.getLocalDate();
    if (!isFirebaseAdminReady()) {
      return { mealAnalyses: 0, chatMessages: 0, dailyInsights: 0 };
    }

    try {
      const db = getAdminDb();
      const snap = await db.doc(`users/${uid}/aiUsage/${todayDate}`).get();
      if (!snap.exists) {
        return { mealAnalyses: 0, chatMessages: 0, dailyInsights: 0 };
      }
      const data = snap.data();
      return {
        mealAnalyses: data?.mealAnalyses || 0,
        chatMessages: data?.chatMessages || 0,
        dailyInsights: data?.dailyInsights || 0,
      };
    } catch {
      return { mealAnalyses: 0, chatMessages: 0, dailyInsights: 0 };
    }
  }
}
