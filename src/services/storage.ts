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

const STORAGE_KEYS = {
  PROFILE: 'calu_user_profile_v2',
  GOALS: 'calu_nutrition_goals_v2',
  MEALS: 'calu_meals_v2',
  HABITS: 'calu_habits_v2',
  WEIGHT: 'calu_weight_logs_v2',
  MEMORY: 'calu_ai_memory_v2',
  CHAT: 'calu_chat_messages_v2',
  WATER: 'calu_water_logs_v2',
};

// Default User Profile
export const DEFAULT_PROFILE: UserProfile = {
  uid: 'usr_local_default',
  name: 'Camila',
  age: 28,
  gender: 'feminino',
  heightCm: 168,
  weightKg: 65.4,
  activityLevel: 'moderado',
  goal: 'melhorar_habitos',
  dietaryPreference: 'livre',
  allergiesNotes: 'Nenhuma restrição severa.',
  plan: 'free',
  onboardingCompleted: true,
  createdAt: '2026-09-01T08:00:00Z',
  updatedAt: '2026-10-03T12:00:00Z',
};

// Default Brazilian Dietary Goals
export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 120, // ~1.8g/kg
  carbohydrates: 230,
  fat: 65,
  fiber: 28,
  waterMl: 2500,
};

// Default Habit state (3-state)
export const DEFAULT_HABITS: HabitState = {
  waterGoalMet: 'completed',
  fruitVeggieMet: 'completed',
  threeMealsMet: 'not_recorded',
  exerciseMet: 'not_recorded',
  goodSleepMet: 'completed',
};

// Seed Brazilian Meals for a realistic starting state
export const SEED_MEALS: Meal[] = [
  {
    id: 'meal_seed_1',
    uid: 'usr_local_default',
    name: 'Café da manhã reforçado',
    mealType: 'breakfast',
    time: '08:15',
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    foods: [
      {
        id: 'food_1',
        name: 'Ovo mexido com azeite',
        estimatedQuantity: 2,
        unit: 'unidades',
        confidence: 0.95,
        calories: 167,
        protein: 12.0,
        carbohydrates: 1.4,
        fat: 12.5,
        fiber: 0.0,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
      {
        id: 'food_2',
        name: 'Pão francês na chapa',
        estimatedQuantity: 1,
        unit: 'unidade (50g)',
        confidence: 0.92,
        calories: 150,
        protein: 4.0,
        carbohydrates: 29.2,
        fat: 1.5,
        fiber: 1.1,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
      {
        id: 'food_3',
        name: 'Café com leite pingado',
        estimatedQuantity: 150,
        unit: 'ml',
        confidence: 0.9,
        calories: 52,
        protein: 4.8,
        carbohydrates: 7.2,
        fat: 0.3,
        fiber: 0.0,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
    ],
    totalCalories: 369,
    totalProtein: 20.8,
    totalCarbohydrates: 37.8,
    totalFat: 14.3,
    totalFiber: 1.1,
    uncertainties: ['Quantidade de azeite estimada em 1 colher de chá.'],
    userConfirmed: true,
    createdAt: '2026-10-03T08:15:00Z',
    updatedAt: '2026-10-03T08:15:00Z',
  },
  {
    id: 'meal_seed_2',
    uid: 'usr_local_default',
    name: 'Almoço Prato Feito (PF Brasileiro)',
    mealType: 'lunch',
    time: '12:45',
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    foods: [
      {
        id: 'food_4',
        name: 'Arroz branco cozido',
        estimatedQuantity: 4,
        unit: 'colheres de sopa (100g)',
        confidence: 0.88,
        calories: 128,
        protein: 2.5,
        carbohydrates: 28.1,
        fat: 0.2,
        fiber: 1.6,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
      {
        id: 'food_5',
        name: 'Feijão carioca com caldo',
        estimatedQuantity: 1,
        unit: 'concha média (140g)',
        confidence: 0.91,
        calories: 106,
        protein: 6.7,
        carbohydrates: 19.0,
        fat: 0.7,
        fiber: 11.9,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
      {
        id: 'food_6',
        name: 'Peito de frango grelhado',
        estimatedQuantity: 1,
        unit: 'filé médio (130g)',
        confidence: 0.94,
        calories: 206,
        protein: 41.6,
        carbohydrates: 0.0,
        fat: 3.2,
        fiber: 0.0,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
      {
        id: 'food_7',
        name: 'Salada mista com tomate e azeite',
        estimatedQuantity: 1,
        unit: 'porção (100g)',
        confidence: 0.85,
        calories: 45,
        protein: 1.2,
        carbohydrates: 3.5,
        fat: 3.0,
        fiber: 2.1,
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      },
    ],
    totalCalories: 485,
    totalProtein: 52.0,
    totalCarbohydrates: 50.6,
    totalFat: 7.1,
    totalFiber: 15.6,
    uncertainties: ['Porção de feijão estimada visualmente pela concha.'],
    userConfirmed: true,
    createdAt: '2026-10-03T12:45:00Z',
    updatedAt: '2026-10-03T12:45:00Z',
  },
];

export const SEED_WEIGHTS: WeightLog[] = [
  { id: 'w1', uid: 'usr_local_default', weightKg: 66.8, unit: 'kg', date: '2026-09-01', createdAt: '2026-09-01T08:00:00Z' },
  { id: 'w2', uid: 'usr_local_default', weightKg: 66.2, unit: 'kg', date: '2026-09-10', createdAt: '2026-09-10T08:00:00Z' },
  { id: 'w3', uid: 'usr_local_default', weightKg: 65.9, unit: 'kg', date: '2026-09-18', createdAt: '2026-09-18T08:00:00Z' },
  { id: 'w4', uid: 'usr_local_default', weightKg: 65.6, unit: 'kg', date: '2026-09-26', createdAt: '2026-09-26T08:00:00Z' },
  { id: 'w5', uid: 'usr_local_default', weightKg: 65.4, unit: 'kg', date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
];

export const SEED_MEMORIES: CaluMemoryItem[] = [
  {
    id: 'm1',
    uid: 'usr_local_default',
    content: 'Prefere almoço tradicional brasileiro (arroz, feijão e proteína magra).',
    category: 'habito',
    source: 'usuario',
    isActive: true,
    createdAt: '2026-09-15T12:00:00Z',
    updatedAt: '2026-09-15T12:00:00Z',
  },
  {
    id: 'm2',
    uid: 'usr_local_default',
    content: 'Gosta de café preto pela manhã e pingado após o almoço.',
    category: 'preferencia',
    source: 'usuario',
    isActive: true,
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z',
  },
  {
    id: 'm3',
    uid: 'usr_local_default',
    content: 'Evita refrigerantes em dias de semana.',
    category: 'rotina',
    source: 'usuario',
    isActive: true,
    createdAt: '2026-09-25T12:00:00Z',
    updatedAt: '2026-09-25T12:00:00Z',
  },
];

export class StorageService {
  static getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
        return DEFAULT_PROFILE;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  static saveProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  static getGoals(): NutritionGoals {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(DEFAULT_GOALS));
        return DEFAULT_GOALS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_GOALS;
    }
  }

  static saveGoals(goals: NutritionGoals): void {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }

  static getMeals(date?: string): Meal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEALS);
      let allMeals: Meal[] = [];
      if (!data) {
        allMeals = SEED_MEALS;
        localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(allMeals));
      } else {
        allMeals = JSON.parse(data);
      }
      if (date) {
        return allMeals.filter(m => m.date === date);
      }
      return allMeals;
    } catch {
      return [];
    }
  }

  static saveMeal(meal: Meal): void {
    const all = this.getMeals();
    const index = all.findIndex(m => m.id === meal.id);
    if (index >= 0) {
      all[index] = meal;
    } else {
      all.unshift(meal);
    }
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(all));
  }

  static deleteMeal(id: string): void {
    const all = this.getMeals().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(all));
  }

  static duplicateMeal(id: string): Meal | null {
    const all = this.getMeals();
    const existing = all.find(m => m.id === id);
    if (!existing) return null;

    const currentUid = AuthService.getCurrentUser()?.uid || existing.uid || 'usr_local_default';
    const nowIso = new Date().toISOString();

    const duplicated: Meal = {
      ...existing,
      id: 'meal_' + Date.now(),
      uid: currentUid,
      name: `${existing.name} (Cópia)`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      timestamp: nowIso,
      userConfirmed: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    all.unshift(duplicated);
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(all));
    return duplicated;
  }

  static getWater(date: string): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATER);
      const logs: Record<string, number> = data ? JSON.parse(data) : {};
      return logs[date] || 1500; // default 1500ml logged for seed day
    } catch {
      return 1500;
    }
  }

  static addWater(date: string, deltaMl: number): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATER);
      const logs: Record<string, number> = data ? JSON.parse(data) : {};
      const current = logs[date] || 0;
      const updated = Math.max(0, current + deltaMl);
      logs[date] = updated;
      localStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(logs));
      return updated;
    } catch {
      return 0;
    }
  }

  static getHabits(date: string): HabitState {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      const logs: Record<string, HabitState> = data ? JSON.parse(data) : {};
      return logs[date] || DEFAULT_HABITS;
    } catch {
      return {
        waterGoalMet: 'not_recorded',
        fruitVeggieMet: 'not_recorded',
        threeMealsMet: 'not_recorded',
        exerciseMet: 'not_recorded',
        goodSleepMet: 'not_recorded',
      };
    }
  }

  static saveHabits(date: string, habits: HabitState): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      const logs: Record<string, HabitState> = data ? JSON.parse(data) : {};
      logs[date] = habits;
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }
  }

  static getWeights(): WeightLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEIGHT);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.WEIGHT, JSON.stringify(SEED_WEIGHTS));
        return SEED_WEIGHTS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_WEIGHTS;
    }
  }

  static addWeight(weightKg: number, date: string, notes?: string): void {
    const list = this.getWeights();
    const existingIndex = list.findIndex(w => w.date === date);
    const currentUid = AuthService.getCurrentUser()?.uid || 'usr_local_default';
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      list[existingIndex].weightKg = weightKg;
      if (notes !== undefined) list[existingIndex].notes = notes;
    } else {
      list.push({
        id: 'w_' + Date.now(),
        uid: currentUid,
        weightKg,
        unit: 'kg',
        date,
        notes,
        createdAt: nowIso,
      });
      list.sort((a, b) => a.date.localeCompare(b.date));
    }
    localStorage.setItem(STORAGE_KEYS.WEIGHT, JSON.stringify(list));

    // Also update current weight in profile
    const profile = this.getProfile();
    profile.weightKg = weightKg;
    this.saveProfile(profile);
  }

  static getMemories(): CaluMemoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(SEED_MEMORIES));
        return SEED_MEMORIES;
      }
      return JSON.parse(data);
    } catch {
      return SEED_MEMORIES;
    }
  }

  static addMemory(content: string, category: CaluMemoryItem['category']): void {
    const list = this.getMemories();
    const currentUid = AuthService.getCurrentUser()?.uid || 'usr_local_default';
    const nowIso = new Date().toISOString();

    list.unshift({
      id: 'm_' + Date.now(),
      uid: currentUid,
      content,
      category,
      source: 'usuario',
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(list));
  }

  static deleteMemory(id: string): void {
    const list = this.getMemories().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(list));
  }

  static getChatMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (!data) {
        const welcome: ChatMessage[] = [
          {
            id: 'init_1',
            sender: 'calu',
            text: 'Olá! Sou a Calu, sua companheira para descomplicar o acompanhamento alimentar. Como está seu dia hoje? Se tiver dúvidas sobre lanches, nutrientes ou refeições, pode me perguntar!',
            timestamp: new Date().toISOString(),
          },
        ];
        localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(welcome));
        return welcome;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveChatMessages(messages: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages));
  }

  // LGPD & Data Minimization: Export all user data as formatted JSON
  static exportAllData(): string {
    const data = {
      profile: this.getProfile(),
      goals: this.getGoals(),
      meals: this.getMeals(),
      weights: this.getWeights(),
      memories: this.getMemories(),
      exportDate: new Date().toISOString(),
      app: 'CALU AI v2.0',
    };
    return JSON.stringify(data, null, 2);
  }

  // LGPD: Complete deletion of all personal data
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
}
