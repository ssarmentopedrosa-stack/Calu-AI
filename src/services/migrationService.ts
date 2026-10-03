import { MealService } from './firestore/MealService';
import { WeightService } from './firestore/WeightService';
import { MemoryService } from './firestore/MemoryService';
import { UserService } from './firestore/UserService';
import { Meal, WeightLog, CaluMemoryItem } from '../types';

export class MigrationService {
  /**
   * Idempotent migration from pre-v2.1 localStorage keys to official Firestore collections.
   * Filters out fictitious/seed data (e.g. Camila, seed meals) to prevent polluting real accounts.
   */
  static async migrateLocalDataToFirestore(uid: string): Promise<{ migrated: boolean; mealsCount: number }> {
    if (!uid) return { migrated: false, mealsCount: 0 };

    const migrationKey = `calu_migrated_v21_${uid}`;
    try {
      if (localStorage.getItem(migrationKey) === 'true') {
        return { migrated: true, mealsCount: 0 };
      }
    } catch {
      return { migrated: false, mealsCount: 0 };
    }

    let migratedMeals = 0;

    try {
      // 1. Check for legacy meals
      const legacyMealsKeys = ['calu_meals_v1', 'calu_meals_v2', `calu_v2_usr_local_default_meals`];
      for (const k of legacyMealsKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const meals: Meal[] = JSON.parse(raw);
          for (const m of meals) {
            // Strictly exclude seed/demo meals
            if (m.id.startsWith('meal_seed_') || m.name.includes('Prato Feito (PF Brasileiro)')) {
              continue;
            }
            const mealToMigrate: Meal = {
              ...m,
              uid,
              id: m.id.startsWith('meal_') ? m.id : `meal_migrated_${m.id}`,
            };
            await MealService.saveMeal(mealToMigrate);
            migratedMeals++;
          }
          localStorage.removeItem(k);
        }
      }

      // 2. Check for legacy weights
      const legacyWeightKeys = ['calu_weight_logs_v1', 'calu_weight_logs_v2'];
      for (const k of legacyWeightKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const weights: WeightLog[] = JSON.parse(raw);
          for (const w of weights) {
            if (w.id.startsWith('w1') || w.id.startsWith('w2') || w.id.startsWith('w3')) {
              continue; // Exclude seed weights
            }
            await WeightService.addWeight(uid, w.weightKg, w.date, w.notes);
          }
          localStorage.removeItem(k);
        }
      }

      // 3. Check for legacy memories
      const legacyMemoryKeys = ['calu_ai_memory_v1', 'calu_ai_memory_v2'];
      for (const k of legacyMemoryKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const mems: CaluMemoryItem[] = JSON.parse(raw);
          for (const m of mems) {
            if (m.id.startsWith('m1') || m.id.startsWith('m2') || m.id.startsWith('m3')) {
              continue; // Exclude seed memories
            }
            await MemoryService.addMemory(uid, m.content, m.category);
          }
          localStorage.removeItem(k);
        }
      }

      // Mark migration as completed idempotently
      localStorage.setItem(migrationKey, 'true');
      console.log(`[MigrationService] Migração para Firestore concluída para usuário ${uid}. Refeições migradas: ${migratedMeals}`);
      return { migrated: true, mealsCount: migratedMeals };
    } catch (err: any) {
      console.error('[MigrationService] Erro durante migração:', err.message);
      return { migrated: false, mealsCount: migratedMeals };
    }
  }
}
