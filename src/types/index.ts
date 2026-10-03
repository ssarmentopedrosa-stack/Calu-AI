export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'supper';

export interface NutritionalDatabaseItem {
  id: string;
  name: string;
  aliases: string[];
  category: 'Cereais e Grãos' | 'Carnes e Ovos' | 'Laticínios' | 'Frutas e Legumes' | 'Pratos Típicos' | 'Pães e Massas' | 'Bebidas' | 'Outros';
  source: string; // e.g. 'TACO - Tabela Brasileira de Composição de Alimentos (4ª edição)'
  sourceVersion?: string;
  servingSize: number;
  servingUnit: string;
  portionMultiplier: number; // standard portion weight in grams/ml
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sodiumPer100g?: number;
  icon?: string;
}

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FoodItem {
  id: string;
  name: string;
  estimatedQuantity: number;
  unit: string;
  normalizedQuantity?: number;
  normalizedUnit?: string;
  confidence?: number;
  confidenceTier?: ConfidenceTier;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  source: string; // Explicit data provenance
  dbFoodId?: string; // Reference to structured database item if matched
}

export interface Meal {
  id: string;
  uid: string; // Associated Firebase User ID
  name: string;
  mealType: MealType;
  time: string;
  date: string; // YYYY-MM-DD local
  timestamp: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  photoUrl?: string;
  photoStoragePath?: string;
  uncertainties?: string[];
  userConfirmed: boolean; // Confirmed by human verification
  createdAt: string;
  updatedAt: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email?: string;
  name: string;
  age: number;
  gender?: 'feminino' | 'masculino' | 'outro' | 'prefiro_nao_dizer';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentario' | 'leve' | 'moderado' | 'muito_ativo';
  goal: 'acompanhar' | 'melhorar_habitos' | 'perder_gordura' | 'ganhar_massa' | 'manter_peso';
  dietaryPreference: 'livre' | 'vegetariano' | 'vegano' | 'low_carb' | 'sem_gluten' | 'sem_lactose';
  allergiesNotes?: string;
  plan: 'free' | 'premium';
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitState {
  waterGoalMet: 'not_recorded' | 'completed' | 'not_completed';
  fruitVeggieMet: 'not_recorded' | 'completed' | 'not_completed';
  threeMealsMet: 'not_recorded' | 'completed' | 'not_completed';
  exerciseMet: 'not_recorded' | 'completed' | 'not_completed';
  goodSleepMet: 'not_recorded' | 'completed' | 'not_completed';
}

export interface WeightLog {
  id: string;
  uid: string;
  weightKg: number;
  date: string;
  unit: 'kg';
  notes?: string;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  uid: string;
  amountMl: number;
  date: string;
  timestamp: string;
}

export interface CaluMemoryItem {
  id: string;
  uid: string;
  content: string;
  category: 'preferencia' | 'restricao' | 'habito' | 'rotina';
  source: 'usuario' | 'conversa_confirmada';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  uid?: string;
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
  source: string;
}

// Strict AI Analysis output (Food identification separated from nutrition calculation)
export interface IdentifiedFoodFromAI {
  name: string;
  estimatedQuantity: number;
  unit: string;
  confidence: number; // 0 to 1
  matchedDbFoodId?: string;
}

export interface MealAnalysisSuccessResponse {
  success: true;
  mealType?: MealType;
  mealNameSuggestion?: string;
  identifiedFoods: IdentifiedFoodFromAI[];
  calculatedFoods: FoodItem[];
  total: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  uncertainties: string[];
}

export interface MealAnalysisErrorResponse {
  success: false;
  errorCode: 'AI_ANALYSIS_FAILED' | 'IMAGE_INVALID' | 'RATE_LIMITED' | 'AUTH_REQUIRED' | 'SERVER_ERROR';
  message: string;
  details?: string;
}

export type MealAnalysisResponse = MealAnalysisSuccessResponse | MealAnalysisErrorResponse;

// Standardized error codes for backend and frontend
export type AppErrorCode =
  | 'AI_ANALYSIS_FAILED'
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'FOOD_NOT_FOUND'
  | 'UPLOAD_FAILED'
  | 'DATABASE_ERROR'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'SERVER_ERROR';
