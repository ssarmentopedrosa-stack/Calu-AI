import { MealAnalysisResponse, Meal, NutritionGoals, HabitState, ChatMessage } from '../types';

export class CaluApiService {
  static async checkHealth(): Promise<{ status: string; hasGeminiKey: boolean; provider: string }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline', hasGeminiKey: false, provider: 'local' };
    }
  }

  static async analyzePhoto(
    imageBase64: string,
    mimeType = 'image/jpeg',
    userNotes?: string
  ): Promise<MealAnalysisResponse> {
    const res = await fetch('/api/analyze-meal-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, userNotes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Não foi possível analisar a fotografia no momento.');
    }

    return await res.json();
  }

  static async analyzeText(text: string, userNotes?: string): Promise<MealAnalysisResponse> {
    const res = await fetch('/api/analyze-meal-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userNotes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Não foi possível analisar a descrição da refeição.');
    }

    return await res.json();
  }

  static async getDailyInsight(
    meals: Meal[],
    targets: NutritionGoals,
    habits: HabitState
  ): Promise<string> {
    try {
      const res = await fetch('/api/daily-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals, targets, habits }),
      });
      if (!res.ok) throw new Error('Insight API error');
      const data = await res.json();
      return data.insight;
    } catch {
      return 'Seu ritmo de acompanhamento está ótimo! Registrar com consistência ajuda você a ter clareza sobre suas escolhas diárias.';
    }
  }

  static async chatWithCalu(
    messages: ChatMessage[],
    userContext: any
  ): Promise<string> {
    try {
      const res = await fetch('/api/chat-calu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userContext }),
      });
      if (!res.ok) throw new Error('Chat API error');
      const data = await res.json();
      return data.reply;
    } catch {
      return 'Estou com uma pequena lentidão na rede, mas estou pronta para te ouvir! Me conte o que você gostaria de planejar.';
    }
  }

  static async lookupBarcode(barcode: string): Promise<any> {
    const res = await fetch(`/api/barcode/${encodeURIComponent(barcode)}`);
    return await res.json();
  }
}
