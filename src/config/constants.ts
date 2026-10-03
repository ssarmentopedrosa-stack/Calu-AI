export const APP_VERSION = '2.1.0';
export const APP_NAME = 'CALU AI';
export const APP_SUBTITLE = 'Seu acompanhamento alimentar inteligente.';

// AI Consumption limits per plan tier
export const AI_LIMITS = {
  free: {
    mealAnalysisPerDay: 5,
    chatPerDay: 20,
    dailyInsightPerDay: 3,
  },
  premium: {
    mealAnalysisPerDay: 30,
    chatPerDay: 100,
    dailyInsightPerDay: 10,
  },
} as const;

export type PlanType = keyof typeof AI_LIMITS;

// Request Timeouts (in ms)
export const TIMEOUTS = {
  AI_ANALYSIS: 12000,
  AI_CHAT: 10000,
  AI_INSIGHT: 8000,
  DEFAULT: 6000,
};

// Image Upload Constraints
export const IMAGE_UPLOAD_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxDimension: 1280, // pixels
  targetFormat: 'image/jpeg' as const,
  quality: 0.82,
};

// Standard Brazilian Nutrition Reference Values
export const BRAZILIAN_TIMEZONE = 'America/Sao_Paulo';

// Demo Mode Toggle (set via VITE_DEMO_MODE=true for testing without real account)
export const IS_DEMO_MODE_DEFAULT = false;
