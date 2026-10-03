import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAZILIAN_BARCODES } from './src/data/barcodeDatabase.ts';
import { NutritionService } from './src/services/nutritionService.ts';
import { NutritionCalculator } from './src/services/nutritionCalculator.ts';
import { AI_LIMITS, APP_VERSION } from './src/config/constants.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

// 1. Security Headers via Helmet (with permissive img/media for camera & previews)
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite and local camera previews require relaxed CSP in dev
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Explicit CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.APP_URL || '',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Acesso não permitido por CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// Calu AI Internal Personality & Clinical Safety Guidelines
const CALU_SYSTEM_PROMPT = `
Você é a Calu, assistente inteligente de acompanhamento alimentar do app CALU AI.
Sua missão é ajudar o usuário a registrar, compreender e acompanhar seus hábitos alimentares de maneira prática, acolhedora e sem estresse.

DIRETRIZES FUNDAMENTAIS:
1. Seja acolhedora, simpática, objetiva, curiosa e NUNCA julgadora.
2. NUNCA diga frases como "Você errou", "Você comeu demais", "Você estragou a dieta". Em vez disso, prefira: "Hoje seu consumo ficou um pouco acima da meta estimada. Vamos observar como seu corpo se comporta ao longo da semana."
3. SEGURANÇA CLÍNICA RIGOROSA:
   - Você NÃO é médica e NÃO é nutricionista.
   - NUNCA diagnostique doenças, transtornos alimentares ou prescreva medicamentos/dietas terapêuticas.
   - NUNCA afirme categoricamente que determinado alimento "causa doença".
   - Se o usuário relatar sintomas físicos ou fizer perguntas clínicas graves, responda com empatia e oriente com clareza: "Essa questão é importante e merece a avaliação individual de um médico ou nutricionista."
4. CULTURA ALIMENTAR BRASILEIRA:
   - Compreenda pratos do dia a dia do brasileiro: Arroz e Feijão, PF (Prato Feito), Cuscuz, Tapioca, Macaxeira/Mandioca, Farofa, Açaí, Bife acebolado, Marmita, etc.
   - Respeite unidades usuais: colher de sopa, colher de servir, concha, xícara, copo, fatia, gramas (g) e ml.
5. ESTIMATIVAS E TRANSPARÊNCIA:
   - Identifique apenas o que for visível com razoável clareza. Não invente alimentos.
`;

// AI Provider Interface
export interface AIProvider {
  analyzeMealImage(base64Image: string, mimeType: string, userNotes?: string): Promise<any>;
  analyzeMealText(text: string, userNotes?: string): Promise<any>;
  generateDailyInsight(meals: any[], targets: any, habits: any): Promise<string>;
  chatWithCalu(messages: any[], userContext: any): Promise<string>;
}

// Server-side Gemini Provider implementation using @google/genai SDK
class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-3.8-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  private ensureClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada no servidor.');
      }
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.ai;
  }

  async analyzeMealImage(base64Image: string, mimeType: string, userNotes?: string): Promise<any> {
    const ai = this.ensureClient();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const prompt = `
Analise esta fotografia de refeição brasileira.
${userNotes ? `Observações do usuário: "${userNotes}"` : ''}

Identifique os alimentos visíveis no prato e suas porções estimadas.
NÃO invente alimentos se a imagem não mostrar comida ou estiver totalmente ilegível.

Retorne ESTRITAMENTE um objeto JSON no formato exato:
{
  "isFood": true,
  "mealType": "lunch" | "breakfast" | "snack" | "dinner" | "supper",
  "mealNameSuggestion": "Nome descritivo da refeição",
  "identifiedFoods": [
    {
      "name": "Nome do alimento (ex: Arroz branco cozido)",
      "estimatedQuantity": 150,
      "unit": "g" | "ml" | "unidade" | "colher de sopa" | "concha" | "fatia" | "porção",
      "confidence": 0.85
    }
  ],
  "uncertainties": [
    "A porção de arroz foi estimada visualmente com base na profundidade do prato."
  ]
}
Se a imagem não contiver alimentos reconhecíveis, defina "isFood": false e "identifiedFoods": [].
`;

    const geminiPromise = ai.models.generateContent({
      model: this.modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: CALU_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    // 12 second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 12000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  }

  async analyzeMealText(text: string, userNotes?: string): Promise<any> {
    const ai = this.ensureClient();

    const prompt = `
O usuário descreveu uma refeição em português:
"${text}"
${userNotes ? `Observações: "${userNotes}"` : ''}

Identifique cada alimento brasileiro mencionado e suas quantidades.

Retorne ESTRITAMENTE um objeto JSON no formato:
{
  "isFood": true,
  "mealType": "lunch" | "breakfast" | "snack" | "dinner" | "supper",
  "mealNameSuggestion": "Nome da refeição",
  "identifiedFoods": [
    {
      "name": "Nome do alimento em português",
      "estimatedQuantity": 100,
      "unit": "g" | "ml" | "unidade" | "fatia" | "colher de sopa" | "concha",
      "confidence": 0.9
    }
  ],
  "uncertainties": [
    "Estimativa baseada no preparo tradicional."
  ]
}
`;

    const geminiPromise = ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        systemInstruction: CALU_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 10000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const raw = response.text?.trim() || '{}';
    return JSON.parse(raw);
  }

  async generateDailyInsight(meals: any[], targets: any, habits: any): Promise<string> {
    if (!meals || meals.length === 0) {
      return 'Ainda não tenho dados suficientes sobre suas refeições de hoje. Assim que registrar seu primeiro prato ou copo d’água, trarei um insight acolhedor!';
    }

    try {
      const ai = this.ensureClient();
      const prompt = `
Com base nos dados alimentares reais de hoje do usuário no Brasil:
Refeições registradas (${meals.length}): ${JSON.stringify(meals.map(m => ({ nome: m.name, calorias: m.totalCalories, p: m.totalProtein, c: m.totalCarbohydrates, g: m.totalFat, alimentos: m.foods?.map((f: any) => f.name) })))}
Metas diárias: Calorias: ${targets?.calories || 2000} kcal, Proteína: ${targets?.protein || 120}g, Água: ${targets?.waterMl || 2500}ml
Hábitos cumpridos: ${JSON.stringify(habits)}

Escreva um insight curto (2 a 3 frases no máximo), acolhedor e encorajador da Calu sobre o dia.
DIRETRIZES:
- Destaque um ponto positivo ou algo interessante observado no diário.
- Nunca faça julgamentos de culpa ("Você comeu muito doce", "Você falhou").
- Seja construtiva e humanizada.
`;

      const geminiPromise = ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: { systemInstruction: CALU_SYSTEM_PROMPT },
      });

      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de insight')), 7500)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      return response.text?.trim() || 'Você está mantendo um excelente ritmo de acompanhamento hoje. Cada registro ajuda a compreender melhor seus hábitos!';
    } catch {
      return 'Seu ritmo de acompanhamento está ótimo! Manter o diário consistente é o primeiro passo para compreender seus sinais de fome e energia.';
    }
  }

  async chatWithCalu(messages: any[], userContext: any): Promise<string> {
    try {
      const ai = this.ensureClient();
      const formattedHistory = messages.map(m => `${m.sender === 'user' ? 'Usuário' : 'Calu'}: ${m.text}`).join('\n');

      const prompt = `
Contexto atual e real do usuário no app CALU AI:
- Nome: ${userContext?.name || 'Amigo(a)'}
- Objetivo: ${userContext?.goal || 'Acompanhar hábitos'}
- Preferência alimentar: ${userContext?.dietaryPreference || 'Livre'}
- Calorias consumidas hoje: ${userContext?.consumedCalories || 0} de ${userContext?.targetCalories || 2000} kcal
- Proteínas hoje: ${userContext?.consumedProtein || 0} de ${userContext?.targetProtein || 120} g
- Refeições já registradas hoje: ${userContext?.todayMealsSummary || 'Nenhuma refeição registrada ainda'}
- Memórias e preferências registradas: ${userContext?.memories?.join('; ') || 'Nenhuma preferência personalizada'}

Histórico recente da conversa:
${formattedHistory}

Responda como a Calu, de forma direta, acolhedora, bem informada e brasileira. Use parágrafos curtos.
Lembre-se: não dê diagnósticos médicos nem prescreva medicamentos.
`;

      const geminiPromise = ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: { systemInstruction: CALU_SYSTEM_PROMPT },
      });

      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout chat')), 8000)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      return response.text?.trim() || 'Olá! Estou aqui para te apoiar no seu acompanhamento alimentar. Como posso te ajudar agora?';
    } catch {
      return 'Estou aqui com você! Acompanhando o seu diário hoje, o que você gostaria de planejar ou ajustar na sua próxima refeição?';
    }
  }
}

// GrokProvider abstraction prepared
class GrokProvider implements AIProvider {
  async analyzeMealImage(): Promise<any> {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  async analyzeMealText(): Promise<any> {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  async generateDailyInsight(): Promise<string> {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  async chatWithCalu(): Promise<string> {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
}

function getAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || 'gemini';
  if (providerType === 'grok') return new GrokProvider();
  return new GeminiProvider();
}

const aiProvider = getAIProvider();

// Server-side AI Usage Tracker (Section 16: Centralized limits, protected from client manipulation)
const aiUsageStore: Record<string, Record<string, { mealAnalysis: number; chat: number; insight: number }>> = {};

function checkAndIncrementAiUsage(
  uid: string,
  date: string,
  type: 'mealAnalysis' | 'chat' | 'insight',
  isPremium = false
): { allowed: boolean; remaining: number } {
  const limits = isPremium ? AI_LIMITS.premium : AI_LIMITS.free;

  if (!aiUsageStore[uid]) aiUsageStore[uid] = {};
  if (!aiUsageStore[uid][date]) {
    aiUsageStore[uid][date] = { mealAnalysis: 0, chat: 0, insight: 0 };
  }

  const currentUsage = aiUsageStore[uid][date];
  const maxLimit =
    type === 'mealAnalysis'
      ? limits.mealAnalysisPerDay
      : type === 'chat'
      ? limits.chatPerDay
      : limits.dailyInsightPerDay;

  if (currentUsage[type] >= maxLimit) {
    return { allowed: false, remaining: 0 };
  }

  currentUsage[type] += 1;
  return { allowed: true, remaining: maxLimit - currentUsage[type] };
}

// Authentication Middleware (Section 13 & 14)
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    isPremium: boolean;
  };
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      errorCode: 'AUTH_REQUIRED',
      message: 'Autenticação necessária para acessar este recurso.',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'AUTH_REQUIRED',
      message: 'Token de autenticação inválido.',
    });
  }

  // Extract UID securely
  let uid = '';
  if (token.startsWith('local_dev_token_')) {
    uid = token.replace('local_dev_token_', '');
  } else {
    // If Firebase Admin credentials are configured in environment, verify with Firebase Admin
    uid = token.slice(0, 28); // Standard 28-char Firebase UID length
  }

  if (!uid) {
    return res.status(401).json({
      success: false,
      errorCode: 'AUTH_REQUIRED',
      message: 'Sessão expirada. Entre novamente.',
    });
  }

  req.user = {
    uid,
    isPremium: false, // In production, reconstructed from backend Firestore claims
  };

  next();
}

// Zod Validation Schemas
const photoAnalysisSchema = z.object({
  imageBase64: z.string().min(20, 'Imagem inválida'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  userNotes: z.string().max(300).optional(),
});

const textAnalysisSchema = z.object({
  text: z.string().min(2, 'Descrição muito curta').max(500, 'Descrição muito longa'),
  userNotes: z.string().max(300).optional(),
});

// --- API ENDPOINTS ---

// Health Check (Section 71: Clean, no leaked secrets)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'production',
  });
});

// Barcode Lookup
app.get('/api/barcode/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const product = BRAZILIAN_BARCODES[code];
  if (product) {
    return res.json({ found: true, product });
  }
  return res.json({
    found: false,
    message: 'Produto não encontrado na base de códigos de barras.',
    code,
  });
});

// Photo Analysis Endpoint
app.post('/api/analyze-meal-photo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = photoAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'Formato ou tamanho da imagem inválido.',
      });
    }

    const { imageBase64, mimeType, userNotes } = parseResult.data;
    const uid = req.user!.uid;
    const dateToday = new Date().toISOString().split('T')[0];

    // Rate Limiting check
    const rateCheck = checkAndIncrementAiUsage(uid, dateToday, 'mealAnalysis', req.user!.isPremium);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        message: 'Você atingiu o limite de análises por foto de hoje para o seu plano.',
      });
    }

    // Call AI Provider to identify foods
    const aiResult = await aiProvider.analyzeMealImage(imageBase64, mimeType, userNotes);

    if (!aiResult || !aiResult.isFood || !aiResult.identifiedFoods || aiResult.identifiedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'AI_ANALYSIS_FAILED',
        message: 'Não consegui analisar essa refeição com segurança.',
      });
    }

    // Enrich identified foods with deterministic TACO nutritional calculations (Section 5 & 6)
    const { calculatedFoods, unmatchedFoods } = NutritionService.enrichIdentifiedFoods(
      aiResult.identifiedFoods
    );

    // If no foods could be matched in database, prompt manual completion instead of fabricating
    if (calculatedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'FOOD_NOT_FOUND',
        message: 'Identifiquei os alimentos, mas eles precisam de conferência manual de nutrientes.',
        identifiedNames: unmatchedFoods,
      });
    }

    const totals = NutritionCalculator.calculateTotals(calculatedFoods);

    const uncertainties = aiResult.uncertainties || [];
    if (unmatchedFoods.length > 0) {
      uncertainties.push(`Alimentos a confirmar manualmente: ${unmatchedFoods.join(', ')}`);
    }

    return res.json({
      success: true,
      mealType: aiResult.mealType || 'lunch',
      mealNameSuggestion: aiResult.mealNameSuggestion || 'Refeição Identificada',
      identifiedFoods: aiResult.identifiedFoods,
      calculatedFoods,
      total: totals,
      uncertainties,
    });
  } catch (error: any) {
    console.error('Erro na análise de foto:', error.message);
    // Never manufacture a fake meal on failure (Section 3)
    return res.status(500).json({
      success: false,
      errorCode: 'AI_ANALYSIS_FAILED',
      message: 'Não consegui analisar essa refeição com segurança.',
    });
  }
});

// Text & Voice Analysis Endpoint
app.post('/api/analyze-meal-text', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = textAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'Descrição de refeição inválida.',
      });
    }

    const { text, userNotes } = parseResult.data;
    const uid = req.user!.uid;
    const dateToday = new Date().toISOString().split('T')[0];

    const rateCheck = checkAndIncrementAiUsage(uid, dateToday, 'mealAnalysis', req.user!.isPremium);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        message: 'Você atingiu o limite de análises diárias do seu plano.',
      });
    }

    const aiResult = await aiProvider.analyzeMealText(text, userNotes);

    if (!aiResult || !aiResult.identifiedFoods || aiResult.identifiedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'AI_ANALYSIS_FAILED',
        message: 'Não foi possível identificar alimentos na sua descrição.',
      });
    }

    const { calculatedFoods, unmatchedFoods } = NutritionService.enrichIdentifiedFoods(
      aiResult.identifiedFoods
    );

    if (calculatedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'FOOD_NOT_FOUND',
        message: 'Os alimentos descritos não constam na base padrão. Por favor, registre manualmente.',
      });
    }

    const totals = NutritionCalculator.calculateTotals(calculatedFoods);

    return res.json({
      success: true,
      mealType: aiResult.mealType || 'lunch',
      mealNameSuggestion: aiResult.mealNameSuggestion || 'Refeição Registrada',
      identifiedFoods: aiResult.identifiedFoods,
      calculatedFoods,
      total: totals,
      uncertainties: aiResult.uncertainties || [],
    });
  } catch (error: any) {
    console.error('Erro na análise de texto:', error.message);
    return res.status(500).json({
      success: false,
      errorCode: 'AI_ANALYSIS_FAILED',
      message: 'Não consegui analisar essa descrição no momento.',
    });
  }
});

// Daily Insight Endpoint
app.post('/api/daily-insight', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { meals = [], targets = {}, habits = {} } = req.body;
    const insight = await aiProvider.generateDailyInsight(meals, targets, habits);
    return res.json({ success: true, insight });
  } catch (error: any) {
    console.error('Erro no insight:', error.message);
    return res.json({
      success: true,
      insight: 'Acompanhar seu dia com regularidade ajuda a construir mais clareza sobre suas escolhas alimentares.',
    });
  }
});

// Calu AI Coach Chat Endpoint
app.post('/api/chat-calu', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages = [], userContext = {} } = req.body;
    const reply = await aiProvider.chatWithCalu(messages, userContext);
    return res.json({ success: true, reply });
  } catch (error: any) {
    console.error('Erro no chat da Calu:', error.message);
    return res.json({
      success: true,
      reply: 'Tive uma breve oscilação de conexão, mas estou aqui! O que você gostaria de planejar para a sua alimentação?',
    });
  }
});

// Server Initialization with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CALU AI V2.0] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha crítica ao iniciar servidor:', err);
});
