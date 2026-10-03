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
import { APP_VERSION } from './src/config/constants.ts';
import { DateService } from './src/services/dateService.ts';
import { initFirebaseAdmin, getAdminAuth, getAdminDb, getAdminStorage, isFirebaseAdminReady } from './server/firebaseAdmin.ts';
import { requireAuth, AuthenticatedRequest } from './server/middleware/requireAuth.ts';
import { ServerAIUsageService } from './server/services/aiUsageService.ts';
import { ServerUserContextService } from './server/services/userContextService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

// Initialize Firebase Admin SDK
initFirebaseAdmin();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite dev server and camera previews require relaxed CSP
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Explicit CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.APP_URL || '',
  process.env.WEB_APP_URL || '',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, capacitor, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Acesso não permitido por política de CORS'));
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
2. NUNCA diga frases punitivas ou de culpa ("Você errou", "Você comeu demais", "Você estragou a dieta"). Em vez disso, prefira: "Hoje seu consumo ficou um pouco acima da meta estimada. Vamos observar como seu corpo se comporta ao longo da semana."
3. SEGURANÇA CLÍNICA RIGOROSA:
   - Você NÃO é médica e NÃO é nutricionista.
   - NUNCA diagnostique doenças, transtornos alimentares ou prescreva medicamentos/dietas terapêuticas.
   - NUNCA afirme categoricamente que determinado alimento "causa doença".
   - Se o usuário relatar sintomas físicos ou fizer perguntas clínicas graves, responda com empatia e oriente com clareza: "Essa questão é importante e merece a avaliação individual de um médico ou nutricionista."
4. CULTURA ALIMENTAR BRASILEIRA:
   - Compreenda pratos do dia a dia do brasileiro: Arroz e Feijão, PF (Prato Feito), Cuscuz, Tapioca, Macaxeira/Mandioca, Farofa, Açaí, Bife acebolado, Marmita, etc.
   - Respeite unidades usuais: colher de sopa, colher de servir, concha, xícara, copo, fatia, gramas (g) e ml.
5. ESTIMATIVAS E TRANSPARÊNCIA:
   - Identifique apenas o que for visível com razoável clareza. NÃO invente alimentos sob nenhuma hipótese.
`;

// AI Provider Interface
export interface AIProvider {
  analyzeMealImage(base64Image: string, mimeType: string, userNotes?: string): Promise<any>;
  analyzeMealText(text: string, userNotes?: string): Promise<any>;
  generateDailyInsight(userContext: any): Promise<string>;
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

  async generateDailyInsight(userContext: any): Promise<string> {
    try {
      const ai = this.ensureClient();
      const prompt = `
Com base nos dados alimentares reais de hoje reconstruídos no servidor para o usuário:
- Nome: ${userContext?.name || 'Usuário'}
- Refeições de hoje: ${userContext?.todayMealsSummary || 'Nenhuma refeição registrada'}
- Calorias consumidas hoje: ${userContext?.consumedCalories || 0} kcal (Meta: ${userContext?.targetCalories || 2000} kcal)
- Proteínas hoje: ${userContext?.consumedProtein || 0} g (Meta: ${userContext?.targetProtein || 120} g)
- Água hoje: ${userContext?.waterConsumedMl || 0} ml (Meta: ${userContext?.waterTargetMl || 2500} ml)
- Hábitos cumpridos hoje: ${userContext?.habitsSummary || 'Nenhum hábito registrado hoje'}

Escreva um insight curto (2 a 3 frases no máximo), acolhedor e encorajador da Calu sobre o dia.
DIRETRIZES:
- Destaque um ponto positivo ou algo interessante observado no diário.
- NUNCA invente refeições ou dados que não foram informados acima.
- Nunca faça julgamentos de culpa ("Você comeu muito doce", "Você falhou").
- Seja construtiva, empática e humanizada.
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
      const formattedHistory = messages
        .slice(-8)
        .map(m => `${m.sender === 'user' ? 'Usuário' : 'Calu'}: ${m.text}`)
        .join('\n');

      const prompt = `
Contexto REAL do usuário reconstruído diretamente do Firestore:
- Nome: ${userContext?.name || 'Amigo(a)'}
- Objetivo: ${userContext?.goal || 'Acompanhar hábitos'}
- Preferência alimentar: ${userContext?.dietaryPreference || 'Livre'}
- Calorias consumidas hoje: ${userContext?.consumedCalories || 0} de ${userContext?.targetCalories || 2000} kcal
- Proteínas hoje: ${userContext?.consumedProtein || 0} de ${userContext?.targetProtein || 120} g
- Refeições reais de hoje: ${userContext?.todayMealsSummary || 'Nenhuma refeição registrada ainda hoje'}
- Água hoje: ${userContext?.waterConsumedMl || 0} ml
- Hábitos de hoje: ${userContext?.habitsSummary || 'Sem registros de hábitos hoje'}
- Memórias cadastradas: ${userContext?.memories?.join('; ') || 'Nenhuma preferência personalizada'}

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

// GrokProvider abstraction (disabled if not configured)
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

// Zod Validation Schemas
const photoAnalysisSchema = z.object({
  imageBase64: z.string().min(20, 'Imagem em formato inválido'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  userNotes: z.string().max(300).optional(),
});

const textAnalysisSchema = z.object({
  text: z.string().min(2, 'Descrição muito curta').max(500, 'Descrição muito longa'),
  userNotes: z.string().max(300).optional(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      sender: z.enum(['user', 'calu']),
      text: z.string().max(1000),
      timestamp: z.string().optional(),
    })
  ).max(20),
});

// --- API ENDPOINTS ---

// Health Check (Public - no secret leakage)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'production',
    firebaseAdminReady: isFirebaseAdminReady(),
  });
});

// Barcode Lookup (Public food catalog lookup)
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

// Photo Analysis Endpoint (Protected by requireAuth)
app.post('/api/analyze-meal-photo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = photoAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: { code: 'INVALID_INPUT', message: 'Formato ou tamanho da imagem inválido.' },
        message: 'Formato ou tamanho da imagem inválido.',
      });
    }

    const { imageBase64, mimeType, userNotes } = parseResult.data;
    const uid = req.user!.uid;

    // Server-side AI Quota check in Firestore
    const rateCheck = await ServerAIUsageService.checkAndIncrement(
      uid,
      'mealAnalysis',
      req.user!.isPremium
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        error: { code: 'RATE_LIMITED', message: 'Você atingiu o limite de análises por foto de hoje para o seu plano.' },
        message: 'Você atingiu o limite de análises por foto de hoje para o seu plano.',
      });
    }

    // Call AI Provider to identify foods
    const aiResult = await aiProvider.analyzeMealImage(imageBase64, mimeType, userNotes);

    if (!aiResult || !aiResult.isFood || !aiResult.identifiedFoods || aiResult.identifiedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'AI_ANALYSIS_FAILED',
        error: { code: 'AI_ANALYSIS_FAILED', message: 'Não consegui analisar essa refeição com segurança.' },
        message: 'Não consegui analisar essa refeição com segurança.',
      });
    }

    // Enrich identified foods with deterministic TACO nutritional calculations
    const { calculatedFoods, unmatchedFoods } = NutritionService.enrichIdentifiedFoods(
      aiResult.identifiedFoods
    );

    // If no foods could be matched in database, prompt manual confirmation instead of fabricating
    if (calculatedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'FOOD_NOT_FOUND',
        error: { code: 'FOOD_NOT_FOUND', message: 'Alimentos identificados precisam de conferência manual de nutrientes.' },
        message: 'Alimentos identificados precisam de conferência manual de nutrientes.',
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
    console.error('[API /analyze-meal-photo] Erro na análise:', error.message);
    return res.status(500).json({
      success: false,
      errorCode: 'AI_ANALYSIS_FAILED',
      error: { code: 'AI_ANALYSIS_FAILED', message: 'Não consegui analisar essa refeição com segurança.' },
      message: 'Não consegui analisar essa refeição com segurança.',
    });
  }
});

// Text & Voice Analysis Endpoint (Protected by requireAuth)
app.post('/api/analyze-meal-text', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = textAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: { code: 'INVALID_INPUT', message: 'Descrição de refeição inválida.' },
        message: 'Descrição de refeição inválida.',
      });
    }

    const { text, userNotes } = parseResult.data;
    const uid = req.user!.uid;

    const rateCheck = await ServerAIUsageService.checkAndIncrement(
      uid,
      'mealAnalysis',
      req.user!.isPremium
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        error: { code: 'RATE_LIMITED', message: 'Você atingiu o limite de análises diárias do seu plano.' },
        message: 'Você atingiu o limite de análises diárias do seu plano.',
      });
    }

    const aiResult = await aiProvider.analyzeMealText(text, userNotes);

    if (!aiResult || !aiResult.identifiedFoods || aiResult.identifiedFoods.length === 0) {
      return res.status(422).json({
        success: false,
        errorCode: 'AI_ANALYSIS_FAILED',
        error: { code: 'AI_ANALYSIS_FAILED', message: 'Não foi possível identificar alimentos na sua descrição.' },
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
        error: { code: 'FOOD_NOT_FOUND', message: 'Os alimentos descritos não constam na base padrão. Por favor, registre manualmente.' },
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
    console.error('[API /analyze-meal-text] Erro:', error.message);
    return res.status(500).json({
      success: false,
      errorCode: 'AI_ANALYSIS_FAILED',
      error: { code: 'AI_ANALYSIS_FAILED', message: 'Não consegui analisar essa descrição no momento.' },
      message: 'Não consegui analisar essa descrição no momento.',
    });
  }
});

// Daily Insight Endpoint (Protected - Rebuilds context server-side from Firestore)
app.post('/api/daily-insight', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    const rateCheck = await ServerAIUsageService.checkAndIncrement(
      uid,
      'dailyInsight',
      req.user!.isPremium
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        error: { code: 'RATE_LIMITED', message: 'Limite diário de insights atingido.' },
        message: 'Limite diário de insights atingido.',
      });
    }

    // Reconstruct user context directly on the server from Firestore (Anti-spoofing)
    const userContext = await ServerUserContextService.buildUserContext(uid);
    const insight = await aiProvider.generateDailyInsight(userContext);

    return res.json({ success: true, insight });
  } catch (error: any) {
    console.error('[API /daily-insight] Erro:', error.message);
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      error: { code: 'SERVER_ERROR', message: 'Não foi possível gerar seu insight agora. Tente novamente mais tarde.' },
      message: 'Não foi possível gerar seu insight agora. Tente novamente mais tarde.',
    });
  }
});

// Calu AI Coach Chat Endpoint (Protected - Rebuilds context server-side from Firestore)
app.post('/api/chat-calu', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = chatSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: { code: 'INVALID_INPUT', message: 'Histórico de mensagens inválido.' },
        message: 'Histórico de mensagens inválido.',
      });
    }

    const uid = req.user!.uid;

    const rateCheck = await ServerAIUsageService.checkAndIncrement(
      uid,
      'chat',
      req.user!.isPremium
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        error: { code: 'RATE_LIMITED', message: 'Você atingiu o limite de mensagens do chat de hoje para o seu plano.' },
        message: 'Você atingiu o limite de mensagens do chat de hoje para o seu plano.',
      });
    }

    // Reconstruct factual context directly from Firestore
    const userContext = await ServerUserContextService.buildUserContext(uid);
    const reply = await aiProvider.chatWithCalu(parseResult.data.messages, userContext);

    return res.json({ success: true, reply });
  } catch (error: any) {
    console.error('[API /chat-calu] Erro:', error.message);
    return res.status(500).json({
      success: false,
      errorCode: 'AI_CHAT_FAILED',
      error: { code: 'AI_CHAT_FAILED', message: 'Tive uma breve oscilação de conexão, por favor tente novamente.' },
      message: 'Tive uma breve oscilação de conexão, por favor tente novamente.',
    });
  }
});

// LGPD Export Data Endpoint (Protected by requireAuth)
app.get('/api/user/export-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Serviço de banco de dados indisponível.' },
      });
    }

    const db = getAdminDb();

    // Recursively export all subcollections for the authenticated user
    const [profileSnap, goalsSnap, mealsSnap, weightsSnap, waterSnap, habitsSnap, memoriesSnap, chatSnap] =
      await Promise.all([
        db.doc(`users/${uid}/preferences/profile`).get(),
        db.doc(`users/${uid}/goals/current`).get(),
        db.collection(`users/${uid}/meals`).get(),
        db.collection(`users/${uid}/weightLogs`).get(),
        db.collection(`users/${uid}/waterLogs`).get(),
        db.collection(`users/${uid}/habits`).get(),
        db.collection(`users/${uid}/memories`).get(),
        db.collection(`users/${uid}/chatMessages`).get(),
      ]);

    const meals: any[] = [];
    mealsSnap.forEach(d => meals.push(d.data()));

    const weights: any[] = [];
    weightsSnap.forEach(d => weights.push(d.data()));

    const water: any[] = [];
    waterSnap.forEach(d => water.push(d.data()));

    const habits: any[] = [];
    habitsSnap.forEach(d => habits.push(d.data()));

    const memories: any[] = [];
    memoriesSnap.forEach(d => memories.push(d.data()));

    const chat: any[] = [];
    chatSnap.forEach(d => chat.push(d.data()));

    const exportBundle = {
      app: 'CALU AI v2.1',
      exportedAt: DateService.getLocalDateTime(),
      uid,
      profile: profileSnap.exists ? profileSnap.data() : null,
      goals: goalsSnap.exists ? goalsSnap.data() : null,
      meals,
      weights,
      waterLogs: water,
      habits,
      memories,
      chatMessages: chat,
    };

    return res.json({ success: true, data: exportBundle });
  } catch (error: any) {
    console.error('[API /user/export-data] Erro:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'EXPORT_FAILED', message: 'Falha ao exportar dados do usuário.' },
    });
  }
});

// LGPD Recursive Delete Account Endpoint (Protected by requireAuth)
app.post('/api/user/delete-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Serviço de banco de dados indisponível.' },
      });
    }

    const db = getAdminDb();
    const auth = getAdminAuth();
    const storage = getAdminStorage();

    // 1. Delete all Firestore subcollections recursively
    const subcollections = [
      'meals',
      'weightLogs',
      'waterLogs',
      'habits',
      'memories',
      'chatMessages',
      'aiUsage',
      'preferences',
      'goals',
    ];

    for (const subcol of subcollections) {
      const snap = await db.collection(`users/${uid}/${subcol}`).get();
      const batch = db.batch();
      snap.forEach(d => batch.delete(d.ref));
      if (!snap.empty) {
        await batch.commit();
      }
    }

    // Delete user root document
    await db.doc(`users/${uid}`).delete().catch(() => null);

    // 2. Delete user files from Storage if bucket is configured
    try {
      const bucket = storage.bucket();
      await bucket.deleteFiles({ prefix: `users/${uid}/` });
    } catch (storageErr: any) {
      console.warn('[LGPD Delete] Aviso na exclusão do Storage:', storageErr.message);
    }

    // 3. Delete Firebase Auth user
    try {
      await auth.deleteUser(uid);
    } catch (authErr: any) {
      console.warn('[LGPD Delete] Aviso na exclusão do Firebase Auth:', authErr.message);
    }

    console.log(`[LGPD Delete] Usuário ${uid} excluído integralmente.`);
    return res.json({
      success: true,
      message: 'Todos os seus dados e sua conta foram excluídos com sucesso.',
    });
  } catch (error: any) {
    console.error('[API /user/delete-account] Erro:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Falha ao processar exclusão de conta.' },
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
    console.log(`[CALU AI V2.1] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha crítica ao iniciar servidor:', err);
});
