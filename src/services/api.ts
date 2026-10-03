import { 
  MealAnalysisResponse, 
  Meal, 
  NutritionGoals, 
  HabitState, 
  ChatMessage 
} from '../types';
import { AuthService } from './authService';

export class CaluApiService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AuthService.getIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async checkHealth(): Promise<{ status: string; version: string; environment: string }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline', version: '2.0.0', environment: 'local' };
    }
  }

  static async analyzePhoto(
    imageBase64: string,
    mimeType = 'image/jpeg',
    userNotes?: string
  ): Promise<MealAnalysisResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/analyze-meal-photo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64, mimeType, userNotes }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return {
        success: false,
        errorCode: data.errorCode || 'AI_ANALYSIS_FAILED',
        message: data.message || 'Não consegui analisar essa refeição com segurança.',
      };
    }

    return data;
  }

  static async analyzeText(text: string, userNotes?: string): Promise<MealAnalysisResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/analyze-meal-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, userNotes }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return {
        success: false,
        errorCode: data.errorCode || 'AI_ANALYSIS_FAILED',
        message: data.message || 'Não foi possível analisar a descrição fornecida.',
      };
    }

    return data;
  }

  static async getDailyInsight(
    meals: Meal[],
    targets: NutritionGoals,
    habits: HabitState
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/daily-insight', {
        method: 'POST',
        headers,
        body: JSON.stringify({ meals, targets, habits }),
      });
      if (!res.ok) throw new Error('Insight API error');
      const data = await res.json();
      return data.insight || 'Acompanhar seu dia com regularidade ajuda a construir mais clareza sobre suas escolhas alimentares.';
    } catch {
      return 'Seu ritmo de acompanhamento está ótimo! Manter o diário consistente é o primeiro passo para compreender seus sinais de fome e energia.';
    }
  }

  static async chatWithCalu(
    messages: ChatMessage[],
    userContext: any
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/chat-calu', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, userContext }),
      });
      if (!res.ok) throw new Error('Chat API error');
      const data = await res.json();
      return data.reply;
    } catch {
      return 'Tive uma breve oscilação de conexão, mas estou pronta para te apoiar. O que você gostaria de planejar?';
    }
  }

  static async lookupBarcode(barcode: string): Promise<any> {
    const res = await fetch(`/api/barcode/${encodeURIComponent(barcode)}`);
    return await res.json();
  }
}
