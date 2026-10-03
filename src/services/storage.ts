import { 
  Meal, 
  UserProfile, 
  NutritionGoals, 
  HabitState, 
  WeightLog, 
  CaluMemoryItem, 
  ChatMessage 
} from '../types';
import { AuthService } from './authService';
import { repository, DEFAULT_INITIAL_GOALS, createCleanProfile, DEFAULT_CLEAN_HABITS } from '../repositories/dataRepository';
import { ChatService } from './firestore/ChatService';
import { DateService } from './dateService';

export { DEFAULT_INITIAL_GOALS, createCleanProfile, DEFAULT_CLEAN_HABITS };

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' && !import.meta.env.PROD;

export class StorageService {
  private static getActiveUid(): string {
    const user = AuthService.getCurrentUser();
    return user?.uid || (isDemoMode ? 'demo_user_authenticated_dev' : '');
  }

  // --- PROFILE ---
  static async getProfile(): Promise<UserProfile> {
    const uid = this.getActiveUid();
    if (!uid) {
      return createCleanProfile('anonimo', 'Novo Usuário');
    }

    const remote = await repository.getProfile(uid);
    if (remote) return remote;

    const authUser = AuthService.getCurrentUser();
    const clean = createCleanProfile(uid, authUser?.displayName || 'Usuário', authUser?.email || undefined);
    await repository.saveProfile(clean);
    return clean;
  }

  static async saveProfile(profile: UserProfile): Promise<void> {
    await repository.saveProfile(profile);
  }

  // --- GOALS ---
  static async getGoals(): Promise<NutritionGoals> {
    const uid = this.getActiveUid();
    if (!uid) return DEFAULT_INITIAL_GOALS;
    return await repository.getGoals(uid);
  }

  static async saveGoals(goals: NutritionGoals): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.saveGoals(uid, goals);
    }
  }

  // --- MEALS ---
  static async getMeals(date?: string): Promise<Meal[]> {
    const uid = this.getActiveUid();
    if (!uid) return [];

    const targetDate = date || DateService.getLocalDate();
    return await repository.getMealsByDate(uid, targetDate);
  }

  static async getAllMeals(limitCount = 50): Promise<Meal[]> {
    const uid = this.getActiveUid();
    if (!uid) return [];
    return await repository.getAllMeals(uid, limitCount);
  }

  static async saveMeal(meal: Meal): Promise<void> {
    const uid = this.getActiveUid();
    const mealWithUid = {
      ...meal,
      uid: meal.uid || uid,
    };
    await repository.saveMeal(mealWithUid);
  }

  static async deleteMeal(id: string): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.deleteMeal(uid, id);
    }
  }

  static async duplicateMeal(id: string): Promise<Meal | null> {
    const uid = this.getActiveUid();
    if (!uid) return null;
    return await repository.duplicateMeal(uid, id);
  }

  // --- WATER ---
  static async getWater(date: string): Promise<number> {
    const uid = this.getActiveUid();
    if (!uid) return 0;
    return await repository.getWaterByDate(uid, date);
  }

  static async addWater(date: string, deltaMl: number): Promise<number> {
    const uid = this.getActiveUid();
    if (!uid) return 0;
    return await repository.addWater(uid, date, deltaMl);
  }

  // --- HABITS ---
  static async getHabits(date: string): Promise<HabitState> {
    const uid = this.getActiveUid();
    if (!uid) return DEFAULT_CLEAN_HABITS;
    return await repository.getHabits(uid, date);
  }

  static async saveHabits(date: string, habits: HabitState): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.saveHabits(uid, date, habits);
    }
  }

  // --- WEIGHTS ---
  static async getWeights(): Promise<WeightLog[]> {
    const uid = this.getActiveUid();
    if (!uid) return [];
    return await repository.getWeights(uid);
  }

  static async addWeight(weightKg: number, date: string, notes?: string): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.addWeight(uid, weightKg, date, notes);
    }
  }

  // --- MEMORIES ---
  static async getMemories(): Promise<CaluMemoryItem[]> {
    const uid = this.getActiveUid();
    if (!uid) return [];
    return await repository.getMemories(uid);
  }

  static async addMemory(content: string, category: CaluMemoryItem['category']): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.addMemory(uid, content, category);
    }
  }

  static async deleteMemory(id: string): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await repository.deleteMemory(uid, id);
    }
  }

  // --- CHAT ---
  static async getChatMessages(): Promise<ChatMessage[]> {
    const uid = this.getActiveUid();
    if (!uid) return [];
    return await ChatService.getChatMessages(uid);
  }

  static async saveChatMessage(message: ChatMessage): Promise<void> {
    const uid = this.getActiveUid();
    if (uid) {
      await ChatService.saveChatMessage(uid, message);
    }
  }
}
