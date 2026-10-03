export const APP_VERSION = '2.2.1';
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

// Image Upload Constraints (Strict 5MB Binary Standard)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3); // ~6.99MB

export const IMAGE_UPLOAD_LIMITS = {
  maxSizeBytes: MAX_IMAGE_BYTES,
  maxBase64Length: MAX_IMAGE_BASE64_LENGTH,
  maxDimension: 1280, // pixels
  targetFormat: 'image/jpeg' as const,
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  quality: 0.82,
};

// Standard Brazilian Nutrition Reference Values
export const BRAZILIAN_TIMEZONE = 'America/Sao_Paulo';

// Centralized User Data Collections (LGPD Delete & Export)
export const USER_DATA_COLLECTIONS = [
  'meals',
  'weightLogs',
  'waterLogs',
  'habits',
  'memories',
  'chatMessages',
  'aiUsage',
  'preferences',
  'goals',
] as const;

export type UserDataCollection = typeof USER_DATA_COLLECTIONS[number];

// Standardized Error Codes across CALU AI
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REVOKED: 'AUTH_REVOKED',
  INVALID_INPUT: 'INVALID_INPUT',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  QUOTA_UNAVAILABLE: 'QUOTA_UNAVAILABLE',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  USER_CONTEXT_UNAVAILABLE: 'USER_CONTEXT_UNAVAILABLE',
  CHAT_HISTORY_UNAVAILABLE: 'CHAT_HISTORY_UNAVAILABLE',
  CHAT_PERSISTENCE_FAILED: 'CHAT_PERSISTENCE_FAILED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  DELETE_INCOMPLETE: 'DELETE_INCOMPLETE',
  EXPORT_FAILED: 'EXPORT_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Demo Mode Toggle (set via VITE_DEMO_MODE=true for testing without real account)
export const IS_DEMO_MODE_DEFAULT = false;
