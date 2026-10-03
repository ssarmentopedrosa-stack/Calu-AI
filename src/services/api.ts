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

  static async checkHealth(): Promise<{ status: string; version: string }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline', version: '2.2.2' };
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
        errorCode: data.error?.code || data.errorCode || 'AI_ANALYSIS_FAILED',
        message: data.error?.message || data.message || 'Não consegui analisar essa refeição com segurança.',
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
        errorCode: data.error?.code || data.errorCode || 'AI_ANALYSIS_FAILED',
        message: data.error?.message || data.message || 'Não foi possível analisar a descrição fornecida.',
      };
    }

    return data;
  }

  static async getDailyInsight(
    _meals?: Meal[],
    _targets?: NutritionGoals,
    _habits?: HabitState
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/daily-insight', {
        method: 'POST',
        headers,
        body: JSON.stringify({}), // Server reconstructs factual context directly from Firestore
      });
      if (!res.ok) throw new Error('Insight API error');
      const data = await res.json();
      return data.insight || 'Acompanhar seu dia com regularidade ajuda a construir mais clareza sobre suas escolhas alimentares.';
    } catch {
      return 'Não foi possível gerar seu insight agora. Tente novamente mais tarde.';
    }
  }

  static async chatWithCalu(
    messages: ChatMessage[],
    _clientContext?: any
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user')?.text || '';
      const res = await fetch('/api/chat-calu', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: lastUserMsg, messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        if (res.status === 429) {
          return 'Você atingiu o limite de mensagens diárias com a Calu para o seu plano.';
        }
        if (res.status === 503) {
          return 'O serviço de atendimento está temporariamente indisponível. Tente novamente em alguns minutos.';
        }
        return data.error?.message || 'Tive uma breve oscilação de conexão, por favor tente enviar sua mensagem novamente.';
      }
      return data.reply;
    } catch {
      return 'Tive uma breve oscilação de conexão, por favor tente enviar sua mensagem novamente.';
    }
  }

  static async lookupBarcode(barcode: string): Promise<any> {
    const res = await fetch(`/api/barcode/${encodeURIComponent(barcode)}`);
    return await res.json();
  }

  static async exportUserData(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/user/export-data', {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error('Falha ao exportar dados da conta.');
    const data = await res.json();
    return data.data;
  }

  static async deleteAccount(): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/user/delete-account', {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Falha ao processar exclusão completa no servidor.');
    }
  }
}
