import { getAdminDb, isFirebaseAdminReady } from '../firebaseAdmin.ts';
import { DateService } from '../../src/services/dateService.ts';

export class UserContextUnavailableError extends Error {
  code = 'USER_CONTEXT_UNAVAILABLE';
  constructor(message = 'Serviço de contexto do usuário indisponível no Firestore.') {
    super(message);
    this.name = 'UserContextUnavailableError';
  }
}

export interface ServerUserContext {
  name: string;
  age?: number;
  weightKg?: number;
  goal: string;
  dietaryPreference: string;
  allergiesNotes?: string;
  targetCalories: number;
  targetProtein: number;
  consumedCalories: number;
  consumedProtein: number;
  waterConsumedMl: number;
  waterTargetMl: number;
  todayMealsSummary: string;
  memories: string[];
  habitsSummary: string;
}

export class ServerUserContextService {
  /**
   * Reconstructs factual user context strictly on the server from Firestore.
   * Completely ignores any client-supplied claims (Anti-tampering).
   * 
   * CRITICAL SECURITY PRINCIPLE (FAIL-CLOSED):
   * If Firestore is down, network fails, or queries fail, it strictly throws
   * UserContextUnavailableError instead of injecting fictitious default nutritional data.
   */
  static async buildUserContext(uid: string): Promise<ServerUserContext> {
    const today = DateService.getLocalDate();

    // Check Firebase Admin readiness
    if (!isFirebaseAdminReady()) {
      if (process.env.NODE_ENV === 'production') {
        throw new UserContextUnavailableError('Firebase Admin não inicializado em produção.');
      }
      // Non-production test mock context
      return {
        name: 'Amigo(a)',
        goal: 'Acompanhar hábitos',
        dietaryPreference: 'Livre',
        targetCalories: 2000,
        targetProtein: 120,
        consumedCalories: 0,
        consumedProtein: 0,
        waterConsumedMl: 0,
        waterTargetMl: 2500,
        todayMealsSummary: 'Nenhuma refeição registrada hoje.',
        memories: [],
        habitsSummary: 'Nenhum hábito registrado hoje.',
      };
    }

    const db = getAdminDb();

    // Fetch all factual user documents without swallowing exceptions
    let profileSnap: FirebaseFirestore.DocumentSnapshot;
    let goalsSnap: FirebaseFirestore.DocumentSnapshot;
    let mealsSnap: FirebaseFirestore.QuerySnapshot;
    let waterSnap: FirebaseFirestore.QuerySnapshot;
    let habitsSnap: FirebaseFirestore.DocumentSnapshot;
    let memoriesSnap: FirebaseFirestore.QuerySnapshot;

    try {
      [profileSnap, goalsSnap, mealsSnap, waterSnap, habitsSnap, memoriesSnap] =
        await Promise.all([
          db.doc(`users/${uid}/preferences/profile`).get(),
          db.doc(`users/${uid}/goals/current`).get(),
          db.collection(`users/${uid}/meals`).where('date', '==', today).get(),
          db.collection(`users/${uid}/waterLogs`).where('date', '==', today).get(),
          db.doc(`users/${uid}/habits/${today}`).get(),
          db.collection(`users/${uid}/memories`).where('isActive', '==', true).limit(10).get(),
        ]);
    } catch (err: any) {
      console.error('[ServerUserContextService] FAIL-CLOSED: Falha de I/O no Firestore:', err.message);
      throw new UserContextUnavailableError(`Falha de I/O ao ler dados do usuário: ${err.message}`);
    }

    // Initialize context: genuine default starting values for empty documents
    const context: ServerUserContext = {
      name: 'Amigo(a)',
      goal: 'Acompanhar hábitos',
      dietaryPreference: 'Livre',
      targetCalories: 2000,
      targetProtein: 120,
      consumedCalories: 0,
      consumedProtein: 0,
      waterConsumedMl: 0,
      waterTargetMl: 2500,
      todayMealsSummary: 'Nenhuma refeição registrada hoje.',
      memories: [],
      habitsSummary: 'Nenhum hábito registrado hoje.',
    };

    // Profile data
    if (profileSnap.exists) {
      const p = profileSnap.data();
      if (p?.name) context.name = p.name;
      if (p?.age) context.age = p.age;
      if (p?.weightKg) context.weightKg = p.weightKg;
      if (p?.goal) context.goal = p.goal;
      if (p?.dietaryPreference) context.dietaryPreference = p.dietaryPreference;
      if (p?.allergiesNotes) context.allergiesNotes = p.allergiesNotes;
    }

    // Goals data
    if (goalsSnap.exists) {
      const g = goalsSnap.data();
      if (g?.calories) context.targetCalories = g.calories;
      if (g?.protein) context.targetProtein = g.protein;
      if (g?.waterMl) context.waterTargetMl = g.waterMl;
    }

    // Meals data
    if (!mealsSnap.empty) {
      let totalCal = 0;
      let totalProt = 0;
      const mealSummaries: string[] = [];

      mealsSnap.forEach(doc => {
        const m = doc.data();
        totalCal += m.totalCalories || 0;
        totalProt += m.totalProtein || 0;
        const foodsStr = (m.foods || [])
          .map((f: any) => `${f.name} (${f.estimatedQuantity}${f.unit || 'g'})`)
          .join(', ');
        mealSummaries.push(
          `${m.name || 'Refeição'} [${m.totalCalories || 0} kcal, ${m.totalProtein || 0}g P]: ${foodsStr}`
        );
      });

      context.consumedCalories = totalCal;
      context.consumedProtein = Number(totalProt.toFixed(1));
      context.todayMealsSummary = mealSummaries.join(' | ');
    }

    // Water data
    if (!waterSnap.empty) {
      let totalWater = 0;
      waterSnap.forEach(doc => {
        totalWater += doc.data()?.amountMl || 0;
      });
      context.waterConsumedMl = totalWater;
    }

    // Habits data
    if (habitsSnap.exists) {
      const h = habitsSnap.data();
      const parts: string[] = [];
      if (h?.waterGoalMet === 'completed') parts.push('Meta de água atingida');
      if (h?.fruitVeggieMet === 'completed') parts.push('Comeu frutas e vegetais');
      if (h?.threeMealsMet === 'completed') parts.push('Fez as 3 refeições principais');
      if (h?.exerciseMet === 'completed') parts.push('Praticou exercício físico');
      if (h?.goodSleepMet === 'completed') parts.push('Dormiu bem');
      if (parts.length > 0) {
        context.habitsSummary = parts.join(', ');
      }
    }

    // Memories data
    if (!memoriesSnap.empty) {
      const mems: string[] = [];
      memoriesSnap.forEach(doc => {
        const m = doc.data();
        if (m?.content) mems.push(m.content);
      });
      context.memories = mems;
    }

    return context;
  }
}
