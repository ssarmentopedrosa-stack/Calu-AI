import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, isFirebaseAdminReady } from '../firebaseAdmin.ts';
import { AI_LIMITS } from '../../src/config/constants.ts';
import { DateService } from '../../src/services/dateService.ts';

export type AIActionType = 'mealAnalysis' | 'chat' | 'dailyInsight';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: 'RATE_LIMITED' | 'QUOTA_UNAVAILABLE' | 'LIMIT_EXCEEDED';
}

// In-memory atomic store used strictly for test/dev environments when Firebase Admin credentials are not attached
const inMemoryQuotaStore: Map<string, { mealAnalyses: number; chatMessages: number; dailyInsights: number }> = new Map();

export class ServerAIUsageService {
  /**
   * Resets in-memory quota store (useful for automated testing)
   */
  static resetInMemoryStore() {
    inMemoryQuotaStore.clear();
  }

  /**
   * Checks and atomically increments AI action counters in Firestore:
   * users/{uid}/aiUsage/{YYYY-MM-DD}
   * 
   * CRITICAL SECURITY PRINCIPLE: FAIL-CLOSED.
   * If Firestore is down, errors, or fails to verify quota, the call is REJECTED.
   * Gemini is NEVER called without verified quota.
   */
  static async checkAndIncrement(
    uid: string,
    action: AIActionType,
    isPremium = false
  ): Promise<QuotaCheckResult> {
    const limits = isPremium ? AI_LIMITS.premium : AI_LIMITS.free;
    const maxLimit =
      action === 'mealAnalysis'
        ? limits.mealAnalysisPerDay
        : action === 'chat'
        ? limits.chatPerDay
        : limits.dailyInsightPerDay;

    const todayDate = DateService.getLocalDate();

    // Dev/Test Fallback when Firebase Admin is not initialized
    if (!isFirebaseAdminReady()) {
      if (process.env.NODE_ENV === 'production') {
        // In production, failure to initialize Firebase Admin MUST fail closed
        console.error('[ServerAIUsageService] FAIL-CLOSED: Firebase Admin não inicializado em produção.');
        return { allowed: false, remaining: 0, reason: 'QUOTA_UNAVAILABLE' };
      }

      // In local dev/testing, enforce atomic in-memory quota limits (strictly no bypass)
      const key = `${uid}_${todayDate}`;
      const userUsage = inMemoryQuotaStore.get(key) || { mealAnalyses: 0, chatMessages: 0, dailyInsights: 0 };
      const currentCount =
        action === 'mealAnalysis'
          ? userUsage.mealAnalyses
          : action === 'chat'
          ? userUsage.chatMessages
          : userUsage.dailyInsights;

      if (currentCount >= maxLimit) {
        return { allowed: false, remaining: 0, reason: 'LIMIT_EXCEEDED' };
      }

      if (action === 'mealAnalysis') userUsage.mealAnalyses += 1;
      else if (action === 'chat') userUsage.chatMessages += 1;
      else userUsage.dailyInsights += 1;

      inMemoryQuotaStore.set(key, userUsage);
      return { allowed: true, remaining: maxLimit - (currentCount + 1) };
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
          return { allowed: false, remaining: 0, reason: 'LIMIT_EXCEEDED' as const };
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
      // FAIL-CLOSED: On transient Firestore/Network error, DENY request.
      console.error('[ServerAIUsageService] FAIL-CLOSED: Erro na transação de quota:', err.message);
      return { allowed: false, remaining: 0, reason: 'QUOTA_UNAVAILABLE' };
    }
  }

  /**
   * Retrieves today's current usage for a user
   */
  static async getTodayUsage(uid: string) {
    const todayDate = DateService.getLocalDate();
    if (!isFirebaseAdminReady()) {
      const key = `${uid}_${todayDate}`;
      const record = inMemoryQuotaStore.get(key);
      return {
        mealAnalyses: record?.mealAnalyses || 0,
        chatMessages: record?.chatMessages || 0,
        dailyInsights: record?.dailyInsights || 0,
      };
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
