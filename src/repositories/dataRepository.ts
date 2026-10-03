import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import {
  Meal,
  UserProfile,
  NutritionGoals,
  HabitState,
  WeightLog,
  WaterLog,
  CaluMemoryItem,
} from '../types';
import { DateService } from '../services/dateService';
import { IS_DEMO_MODE_DEFAULT } from '../config/constants';

// Local storage fallback keys scoped by UID
const getStorageKey = (uid: string, entity: string) => `calu_v2_${uid}_${entity}`;

export interface IMealRepository {
  getMealsByDate(uid: string, date: string): Promise<Meal[]>;
  getAllMeals(uid: string, limitCount?: number): Promise<Meal[]>;
  saveMeal(meal: Meal): Promise<void>;
  deleteMeal(uid: string, mealId: string): Promise<void>;
}

export interface IProfileRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  getGoals(uid: string): Promise<NutritionGoals>;
  saveGoals(uid: string, goals: NutritionGoals): Promise<void>;
}

export interface IWaterRepository {
  getWaterByDate(uid: string, date: string): Promise<number>;
  addWaterLog(log: WaterLog): Promise<number>;
}

export interface IWeightRepository {
  getWeights(uid: string): Promise<WeightLog[]>;
  saveWeight(weight: WeightLog): Promise<void>;
}

export interface IMemoryRepository {
  getMemories(uid: string): Promise<CaluMemoryItem[]>;
  saveMemory(memory: CaluMemoryItem): Promise<void>;
  deleteMemory(uid: string, id: string): Promise<void>;
}

export interface IHabitRepository {
  getHabits(uid: string, date: string): Promise<HabitState>;
  saveHabits(uid: string, date: string, habits: HabitState): Promise<void>;
}

// Default initial empty goals
export const DEFAULT_INITIAL_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 120,
  carbohydrates: 230,
  fat: 65,
  fiber: 28,
  waterMl: 2500,
};

// Default initial empty profile for new users
export const createInitialProfile = (uid: string, name = 'Usuário'): UserProfile => ({
  uid,
  name,
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

// Default clean initial habit state (with three states: not_recorded | completed | not_completed)
export const DEFAULT_INITIAL_HABITS: HabitState = {
  waterGoalMet: 'not_recorded',
  fruitVeggieMet: 'not_recorded',
  threeMealsMet: 'not_recorded',
  exerciseMet: 'not_recorded',
  goodSleepMet: 'not_recorded',
};

// Unified Data Repository Implementation
export class DataRepository
  implements
    IMealRepository,
    IProfileRepository,
    IWaterRepository,
    IWeightRepository,
    IMemoryRepository,
    IHabitRepository
{
  // --- MEALS ---
  async getMealsByDate(uid: string, date: string): Promise<Meal[]> {
    if (isFirebaseConfigured) {
      try {
        const mealsRef = collection(db, 'users', uid, 'meals');
        const q = query(mealsRef, where('date', '==', date), orderBy('timestamp', 'asc'));
        const snap = await getDocs(q);
        const meals: Meal[] = [];
        snap.forEach(docSnap => meals.push(docSnap.data() as Meal));
        return meals;
      } catch (e) {
        console.warn('Firestore fetch failed, falling back to local cache:', e);
      }
    }

    // Local persistent storage
    try {
      const data = localStorage.getItem(getStorageKey(uid, 'meals'));
      if (!data) return [];
      const all: Meal[] = JSON.parse(data);
      return all.filter(m => m.date === date);
    } catch {
      return [];
    }
  }

  async getAllMeals(uid: string, limitCount = 50): Promise<Meal[]> {
    if (isFirebaseConfigured) {
      try {
        const mealsRef = collection(db, 'users', uid, 'meals');
        const q = query(mealsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const meals: Meal[] = [];
        snap.forEach(docSnap => meals.push(docSnap.data() as Meal));
        return meals;
      } catch (e) {
        console.warn('Firestore fetch all failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'meals'));
      if (!data) return [];
      const all: Meal[] = JSON.parse(data);
      return all.slice(0, limitCount);
    } catch {
      return [];
    }
  }

  async saveMeal(meal: Meal): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', meal.uid, 'meals', meal.id);
        await setDoc(docRef, meal, { merge: true });
      } catch (e) {
        console.warn('Firestore meal save failed, saving to local cache:', e);
      }
    }

    // Save to local cache
    try {
      const key = getStorageKey(meal.uid, 'meals');
      const data = localStorage.getItem(key);
      const all: Meal[] = data ? JSON.parse(data) : [];
      const idx = all.findIndex(m => m.id === meal.id);
      if (idx >= 0) {
        all[idx] = meal;
      } else {
        all.unshift(meal);
      }
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) {
      console.error('Local meal save error:', e);
    }
  }

  async deleteMeal(uid: string, mealId: string): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'meals', mealId);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Firestore meal delete failed:', e);
      }
    }

    try {
      const key = getStorageKey(uid, 'meals');
      const data = localStorage.getItem(key);
      if (data) {
        const all: Meal[] = JSON.parse(data);
        const filtered = all.filter(m => m.id !== mealId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Local meal delete error:', e);
    }
  }

  // --- PROFILE & GOALS ---
  async getProfile(uid: string): Promise<UserProfile | null> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'preferences', 'profile');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as UserProfile;
        }
      } catch (e) {
        console.warn('Firestore profile fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'profile'));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', profile.uid, 'preferences', 'profile');
        await setDoc(docRef, profile, { merge: true });
      } catch (e) {
        console.warn('Firestore profile save failed:', e);
      }
    }

    localStorage.setItem(getStorageKey(profile.uid, 'profile'), JSON.stringify(profile));
  }

  async getGoals(uid: string): Promise<NutritionGoals> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'goals', 'current');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as NutritionGoals;
        }
      } catch (e) {
        console.warn('Firestore goals fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'goals'));
      return data ? JSON.parse(data) : DEFAULT_INITIAL_GOALS;
    } catch {
      return DEFAULT_INITIAL_GOALS;
    }
  }

  async saveGoals(uid: string, goals: NutritionGoals): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'goals', 'current');
        await setDoc(docRef, goals, { merge: true });
      } catch (e) {
        console.warn('Firestore goals save failed:', e);
      }
    }

    localStorage.setItem(getStorageKey(uid, 'goals'), JSON.stringify(goals));
  }

  // --- WATER ---
  async getWaterByDate(uid: string, date: string): Promise<number> {
    if (isFirebaseConfigured) {
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
      } catch (e) {
        console.warn('Firestore water fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'water'));
      const logs: WaterLog[] = data ? JSON.parse(data) : [];
      return logs.filter(l => l.date === date).reduce((acc, l) => acc + (l.amountMl || 0), 0);
    } catch {
      return 0;
    }
  }

  async addWaterLog(log: WaterLog): Promise<number> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', log.uid, 'waterLogs', log.id);
        await setDoc(docRef, log);
      } catch (e) {
        console.warn('Firestore water save failed:', e);
      }
    }

    try {
      const key = getStorageKey(log.uid, 'water');
      const data = localStorage.getItem(key);
      const logs: WaterLog[] = data ? JSON.parse(data) : [];
      logs.push(log);
      localStorage.setItem(key, JSON.stringify(logs));
      return logs.filter(l => l.date === log.date).reduce((acc, l) => acc + (l.amountMl || 0), 0);
    } catch {
      return log.amountMl;
    }
  }

  // --- WEIGHT ---
  async getWeights(uid: string): Promise<WeightLog[]> {
    if (isFirebaseConfigured) {
      try {
        const weightRef = collection(db, 'users', uid, 'weightLogs');
        const q = query(weightRef, orderBy('date', 'asc'));
        const snap = await getDocs(q);
        const list: WeightLog[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as WeightLog));
        return list;
      } catch (e) {
        console.warn('Firestore weight fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'weights'));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveWeight(weight: WeightLog): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', weight.uid, 'weightLogs', weight.id);
        await setDoc(docRef, weight, { merge: true });
      } catch (e) {
        console.warn('Firestore weight save failed:', e);
      }
    }

    try {
      const key = getStorageKey(weight.uid, 'weights');
      const data = localStorage.getItem(key);
      const list: WeightLog[] = data ? JSON.parse(data) : [];
      const idx = list.findIndex(w => w.date === weight.date);
      if (idx >= 0) {
        list[idx] = weight;
      } else {
        list.push(weight);
        list.sort((a, b) => a.date.localeCompare(b.date));
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  // --- MEMORIES ---
  async getMemories(uid: string): Promise<CaluMemoryItem[]> {
    if (isFirebaseConfigured) {
      try {
        const memRef = collection(db, 'users', uid, 'memories');
        const q = query(memRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: CaluMemoryItem[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as CaluMemoryItem));
        return list;
      } catch (e) {
        console.warn('Firestore memory fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'memories'));
      const list: CaluMemoryItem[] = data ? JSON.parse(data) : [];
      return list.filter(m => m.isActive);
    } catch {
      return [];
    }
  }

  async saveMemory(memory: CaluMemoryItem): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', memory.uid, 'memories', memory.id);
        await setDoc(docRef, memory, { merge: true });
      } catch (e) {
        console.warn('Firestore memory save failed:', e);
      }
    }

    try {
      const key = getStorageKey(memory.uid, 'memories');
      const data = localStorage.getItem(key);
      const list: CaluMemoryItem[] = data ? JSON.parse(data) : [];
      const idx = list.findIndex(m => m.id === memory.id);
      if (idx >= 0) {
        list[idx] = memory;
      } else {
        list.unshift(memory);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  async deleteMemory(uid: string, id: string): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'memories', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Firestore memory delete failed:', e);
      }
    }

    try {
      const key = getStorageKey(uid, 'memories');
      const data = localStorage.getItem(key);
      if (data) {
        const list: CaluMemoryItem[] = JSON.parse(data);
        const filtered = list.filter(m => m.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- HABITS ---
  async getHabits(uid: string, date: string): Promise<HabitState> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'habits', date);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as HabitState;
        }
      } catch (e) {
        console.warn('Firestore habit fetch failed:', e);
      }
    }

    try {
      const data = localStorage.getItem(getStorageKey(uid, 'habits'));
      const map: Record<string, HabitState> = data ? JSON.parse(data) : {};
      return map[date] || DEFAULT_INITIAL_HABITS;
    } catch {
      return DEFAULT_INITIAL_HABITS;
    }
  }

  async saveHabits(uid: string, date: string, habits: HabitState): Promise<void> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', uid, 'habits', date);
        await setDoc(docRef, habits, { merge: true });
      } catch (e) {
        console.warn('Firestore habit save failed:', e);
      }
    }

    try {
      const key = getStorageKey(uid, 'habits');
      const data = localStorage.getItem(key);
      const map: Record<string, HabitState> = data ? JSON.parse(data) : {};
      map[date] = habits;
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
  }

  // --- LGPD & DATA EXPORT ---
  async exportUserData(uid: string) {
    const profile = await this.getProfile(uid);
    const goals = await this.getGoals(uid);
    const meals = await this.getAllMeals(uid, 500);
    const weights = await this.getWeights(uid);
    const memories = await this.getMemories(uid);

    return {
      exportedAt: DateService.getLocalDateTime(),
      uid,
      profile,
      goals,
      meals,
      weights,
      memories,
    };
  }

  async wipeUserData(uid: string): Promise<void> {
    // Clear all local entities for this UID
    ['meals', 'profile', 'goals', 'water', 'weights', 'memories', 'habits'].forEach(entity => {
      localStorage.removeItem(getStorageKey(uid, entity));
    });
  }
}

export const repository = new DataRepository();
