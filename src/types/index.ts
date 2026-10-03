export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'supper';

export interface FoodItem {
  id: string;
  name: string;
  estimatedQuantity: number;
  unit: string; // 'g' | 'ml' | 'unidade' | 'colher' | 'concha' | 'fatia' | 'xícara' | 'copo' | 'porção'
  confidence?: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

export interface Meal {
  id: string;
  userId?: string;
  name: string;
  mealType: MealType;
  time: string;
  date: string; // YYYY-MM-DD
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  photoUrl?: string;
  uncertainties?: string[];
  createdAt?: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender?: 'feminino' | 'masculino' | 'outro' | 'prefiro_nao_dizer';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentario' | 'leve' | 'moderado' | 'muito_ativo';
  goal: 'acompanhar' | 'melhorar_habitos' | 'perder_gordura' | 'ganhar_massa' | 'manter_peso';
  dietaryPreference: 'livre' | 'vegetariano' | 'vegano' | 'low_carb' | 'sem_gluten' | 'sem_lactose';
  allergiesNotes?: string;
  isPremium: boolean;
  onboardingCompleted: boolean;
  dailyAiUsage: number;
  lastAiUsageDate: string;
}

export interface HabitState {
  waterGoalMet: boolean;
  fruitVeggieMet: boolean;
  threeMealsMet: boolean;
  exerciseMet: boolean;
  goodSleepMet: boolean;
}

export interface WeightLog {
  id: string;
  weightKg: number;
  date: string;
  note?: string;
}

export interface CaluMemoryItem {
  id: string;
  content: string;
  category: 'preferencia' | 'restricao' | 'habito' | 'rotina';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'calu';
  text: string;
  timestamp: string;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string;
  servingSize: number;
  unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  category: string;
}

export interface MealAnalysisResponse {
  mealType?: MealType;
  mealNameSuggestion?: string;
  foods: Array<{
    name: string;
    estimatedQuantity: number;
    unit: string;
    confidence?: number;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  }>;
  total: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  uncertainties: string[];
}
