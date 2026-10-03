import {
  Meal,
  UserProfile,
  NutritionGoals,
  HabitState,
  WeightLog,
  CaluMemoryItem,
} from '../types';
import { MealService } from '../services/firestore/MealService';
import { UserService, DEFAULT_INITIAL_GOALS, createCleanProfile } from '../services/firestore/UserService';
import { WaterService } from '../services/firestore/WaterService';
import { WeightService } from '../services/firestore/WeightService';
import { HabitService, DEFAULT_CLEAN_HABITS } from '../services/firestore/HabitService';
import { MemoryService } from '../services/firestore/MemoryService';
import { CaluApiService } from '../services/api';

export { DEFAULT_INITIAL_GOALS, createCleanProfile, DEFAULT_CLEAN_HABITS };

export interface IMealRepository {
  getMealsByDate(uid: string, date: string): Promise<Meal[]>;
  getAllMeals(uid: string, limitCount?: number): Promise<Meal[]>;
  saveMeal(meal: Meal): Promise<void>;
  deleteMeal(uid: string, mealId: string): Promise<void>;
  duplicateMeal(uid: string, mealId: string): Promise<Meal | null>;
}

export interface IProfileRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  getGoals(uid: string): Promise<NutritionGoals>;
  saveGoals(uid: string, goals: NutritionGoals): Promise<void>;
}

export interface IWaterRepository {
  getWaterByDate(uid: string, date: string): Promise<number>;
  addWater(uid: string, date: string, deltaMl: number): Promise<number>;
}

export interface IWeightRepository {
  getWeights(uid: string): Promise<WeightLog[]>;
  addWeight(uid: string, weightKg: number, date: string, notes?: string): Promise<void>;
}

export interface IMemoryRepository {
  getMemories(uid: string): Promise<CaluMemoryItem[]>;
  addMemory(uid: string, content: string, category: CaluMemoryItem['category']): Promise<void>;
  saveMemory(memory: CaluMemoryItem): Promise<void>;
  deleteMemory(uid: string, id: string): Promise<void>;
}

export interface IHabitRepository {
  getHabits(uid: string, date: string): Promise<HabitState>;
  saveHabits(uid: string, date: string, habits: HabitState): Promise<void>;
}

export class DataRepository
  implements
    IMealRepository,
    IProfileRepository,
    IWaterRepository,
    IWeightRepository,
    IMemoryRepository,
    IHabitRepository
{
  // Meals
  async getMealsByDate(uid: string, date: string): Promise<Meal[]> {
    return await MealService.getMealsByDate(uid, date);
  }

  async getAllMeals(uid: string, limitCount = 50): Promise<Meal[]> {
    return await MealService.getAllMeals(uid, limitCount);
  }

  async saveMeal(meal: Meal): Promise<void> {
    await MealService.saveMeal(meal);
  }

  async deleteMeal(uid: string, mealId: string): Promise<void> {
    await MealService.deleteMeal(uid, mealId);
  }

  async duplicateMeal(uid: string, mealId: string): Promise<Meal | null> {
    return await MealService.duplicateMeal(uid, mealId);
  }

  // Profile & Goals
  async getProfile(uid: string): Promise<UserProfile | null> {
    return await UserService.getProfile(uid);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await UserService.saveProfile(profile);
  }

  async getGoals(uid: string): Promise<NutritionGoals> {
    return await UserService.getGoals(uid);
  }

  async saveGoals(uid: string, goals: NutritionGoals): Promise<void> {
    await UserService.saveGoals(uid, goals);
  }

  // Water
  async getWaterByDate(uid: string, date: string): Promise<number> {
    return await WaterService.getWaterByDate(uid, date);
  }

  async addWater(uid: string, date: string, deltaMl: number): Promise<number> {
    return await WaterService.addWater(uid, date, deltaMl);
  }

  // Weight
  async getWeights(uid: string): Promise<WeightLog[]> {
    return await WeightService.getWeights(uid);
  }

  async addWeight(uid: string, weightKg: number, date: string, notes?: string): Promise<void> {
    await WeightService.addWeight(uid, weightKg, date, notes);
  }

  // Memories
  async getMemories(uid: string): Promise<CaluMemoryItem[]> {
    return await MemoryService.getMemories(uid);
  }

  async addMemory(uid: string, content: string, category: CaluMemoryItem['category']): Promise<void> {
    await MemoryService.addMemory(uid, content, category);
  }

  async saveMemory(memory: CaluMemoryItem): Promise<void> {
    await MemoryService.saveMemory(memory);
  }

  async deleteMemory(uid: string, id: string): Promise<void> {
    await MemoryService.deleteMemory(uid, id);
  }

  // Habits
  async getHabits(uid: string, date: string): Promise<HabitState> {
    return await HabitService.getHabits(uid, date);
  }

  async saveHabits(uid: string, date: string, habits: HabitState): Promise<void> {
    await HabitService.saveHabits(uid, date, habits);
  }

  // LGPD
  async exportUserData(): Promise<any> {
    return await CaluApiService.exportUserData();
  }

  async deleteAccount(): Promise<void> {
    await CaluApiService.deleteAccount();
  }
}

export const repository = new DataRepository();
