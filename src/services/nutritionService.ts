import { FOOD_DATABASE } from '../data/foodDatabase';
import { NutritionalDatabaseItem, FoodItem, IdentifiedFoodFromAI } from '../types';
import { NutritionCalculator } from './nutritionCalculator';

/**
 * Normalizes text removing accents, diacritics, and lowercase.
 */
export function normalizeNutritionText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normalizes common Brazilian Portuguese plurals to singular.
 * e.g., 'ovos' -> 'ovo', 'maçãs' -> 'maca', 'colheres' -> 'colher',
 * 'conchas' -> 'concha', 'xícaras' -> 'xicara', 'pães' -> 'pao'.
 */
export function singularizeNutritionWord(word: string): string {
  const w = normalizeNutritionText(word);
  if (!w || w.length <= 2) return w;

  if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('res') || w.endsWith('zes') || w.endsWith('nes')) return w.slice(0, -2);
  if (w.endsWith('is') && !w.endsWith('lis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('ns')) return w.slice(0, -2) + 'm';
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('as')) return w.slice(0, -1);
  if (w.endsWith('as') && w.length > 3) return w.slice(0, -1);
  return w;
}

export function normalizePluralPhrase(phrase: string): string {
  const norm = normalizeNutritionText(phrase);
  return norm
    .split(/\s+/)
    .map(singularizeNutritionWord)
    .join(' ');
}

export interface HouseholdMeasureResult {
  gramsOrMl: number;
  recognized: boolean;
  normalizedUnit: string;
  requiresConfirmation: boolean;
}

/**
 * Converts Brazilian household measures deterministically into grams or milliliters.
 * Handles:
 * - xícara (240 ml)
 * - copo americano (190 ml)
 * - copo (250 ml)
 * - colher de sopa (15 ml/g)
 * - colher de chá (5 ml/g)
 * - colher de servir (45-50 g)
 * - concha (130-140 g)
 * - escumadeira (50 g)
 * - fatia (35-40 g)
 * - unidade (portionMultiplier)
 *
 * Unknown units NEVER become 1 g; they return recognized: false and requiresConfirmation: true.
 */
export function resolveHouseholdMeasure(
  rawUnit: string,
  quantity: number,
  dbItem?: NutritionalDatabaseItem
): HouseholdMeasureResult {
  const qty = Number(quantity);
  const safeQty = !isNaN(qty) && qty > 0 ? qty : 1;

  if (!rawUnit || typeof rawUnit !== 'string' || rawUnit.trim().length === 0) {
    return {
      gramsOrMl: 0,
      recognized: false,
      normalizedUnit: 'desconhecida',
      requiresConfirmation: true,
    };
  }

  const u = normalizeNutritionText(rawUnit);
  const uSingular = normalizePluralPhrase(u);

  // 1. Grams / Kilograms / Milliliters / Liters
  if (u === 'g' || u === 'grama' || u === 'gramas' || uSingular === 'grama') {
    return { gramsOrMl: safeQty, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }
  if (u === 'kg' || u === 'quilo' || u === 'quilos' || u === 'quilograma' || uSingular === 'quilo') {
    return { gramsOrMl: safeQty * 1000, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }
  if (u === 'ml' || u === 'mililitro' || u === 'mililitros' || uSingular === 'mililitro') {
    return { gramsOrMl: safeQty, recognized: true, normalizedUnit: 'ml', requiresConfirmation: false };
  }
  if (u === 'l' || u === 'litro' || u === 'litros' || uSingular === 'litro') {
    return { gramsOrMl: safeQty * 1000, recognized: true, normalizedUnit: 'ml', requiresConfirmation: false };
  }

  // 2. Copo americano (190 ml) — must be checked before generic "copo"
  if (
    u.includes('copo americano') ||
    u.includes('americano') ||
    uSingular.includes('copo americano')
  ) {
    return { gramsOrMl: safeQty * 190, recognized: true, normalizedUnit: 'ml', requiresConfirmation: false };
  }

  // 3. Copo (250 ml)
  if (
    u === 'copo' ||
    u === 'copos' ||
    uSingular === 'copo' ||
    u.includes('copo de requeijao') ||
    u.includes('copo duplo') ||
    u.includes('copo padrao')
  ) {
    return { gramsOrMl: safeQty * 250, recognized: true, normalizedUnit: 'ml', requiresConfirmation: false };
  }

  // 4. Xícara (240 ml)
  if (
    u.includes('xicara') ||
    uSingular.includes('xicara') ||
    u.includes('chavena')
  ) {
    return { gramsOrMl: safeQty * 240, recognized: true, normalizedUnit: 'ml', requiresConfirmation: false };
  }

  // 5. Colher de sopa (15 ml / g)
  if (
    u.includes('colher de sopa') ||
    u.includes('colheres de sopa') ||
    u.includes('colher sopa') ||
    uSingular.includes('colher de sopa') ||
    uSingular.includes('colher sopa')
  ) {
    const multiplier =
      dbItem?.servingUnit && normalizeNutritionText(dbItem.servingUnit).includes('colher de sopa')
        ? dbItem.portionMultiplier
        : 15;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 6. Colher de chá (5 ml / g)
  if (
    u.includes('colher de cha') ||
    u.includes('colheres de cha') ||
    u.includes('colher cha') ||
    uSingular.includes('colher de cha') ||
    uSingular.includes('colher cha') ||
    u.includes('colher cafe')
  ) {
    return { gramsOrMl: safeQty * 5, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 7. Colher de servir (45-50 g)
  if (
    u.includes('colher de servir') ||
    u.includes('colheres de servir') ||
    u.includes('colher servir') ||
    uSingular.includes('colher de servir')
  ) {
    const multiplier =
      dbItem?.servingUnit && normalizeNutritionText(dbItem.servingUnit).includes('colher de servir')
        ? dbItem.portionMultiplier
        : 45;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 8. Concha (130-140 g)
  if (
    u.includes('concha') ||
    uSingular.includes('concha')
  ) {
    const multiplier =
      dbItem?.servingUnit && normalizeNutritionText(dbItem.servingUnit).includes('concha')
        ? dbItem.portionMultiplier
        : 130;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 9. Escumadeira (50 g)
  if (
    u.includes('escumadeira') ||
    uSingular.includes('escumadeira')
  ) {
    const multiplier =
      dbItem?.servingUnit && normalizeNutritionText(dbItem.servingUnit).includes('escumadeira')
        ? dbItem.portionMultiplier
        : 50;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 10. Fatia (35-40 g)
  if (
    u.includes('fatia') ||
    uSingular.includes('fatia')
  ) {
    const multiplier =
      dbItem?.servingUnit && normalizeNutritionText(dbItem.servingUnit).includes('fatia')
        ? dbItem.portionMultiplier
        : (dbItem?.portionMultiplier || 35);
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 11. Unidade (portionMultiplier)
  if (
    u === 'unidade' ||
    u === 'unidades' ||
    u === 'unid' ||
    u === 'un' ||
    uSingular === 'unidade'
  ) {
    const multiplier = dbItem?.portionMultiplier || dbItem?.servingSize || 100;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 12. Porção
  if (
    u.includes('porcao') ||
    uSingular.includes('porcao')
  ) {
    const multiplier = dbItem?.portionMultiplier || dbItem?.servingSize || 100;
    return { gramsOrMl: safeQty * multiplier, recognized: true, normalizedUnit: 'g', requiresConfirmation: false };
  }

  // 13. UNKNOWN UNIT: Strictly DO NOT convert to 1 g!
  // Demands user confirmation.
  return {
    gramsOrMl: 0,
    recognized: false,
    normalizedUnit: rawUnit,
    requiresConfirmation: true,
  };
}

export class NutritionService {
  /**
   * Looks up a food in the TACO food database matching either direct name or known aliases.
   * Accents and plural forms are normalized so queries like 'ovos' match 'Ovo de galinha cozido',
   * and 'maçãs' matches 'Maçã'.
   */
  static findFood(query: string): NutritionalDatabaseItem | null {
    if (!query) return null;
    const clean = normalizeNutritionText(query);
    const cleanSingular = normalizePluralPhrase(query);

    // 1. Exact match on normalized name
    const exact = FOOD_DATABASE.find(f => {
      const fNorm = normalizeNutritionText(f.name);
      return fNorm === clean || fNorm === cleanSingular;
    });
    if (exact) return exact;

    // 2. Exact match on normalized aliases
    const aliasMatch = FOOD_DATABASE.find(f =>
      f.aliases.some(a => {
        const aNorm = normalizeNutritionText(a);
        return aNorm === clean || aNorm === cleanSingular;
      })
    );
    if (aliasMatch) return aliasMatch;

    // 3. Normalized inclusion match
    const partial = FOOD_DATABASE.find(f => {
      const fNorm = normalizeNutritionText(f.name);
      const fSingular = normalizePluralPhrase(f.name);
      return (
        fNorm.includes(clean) ||
        clean.includes(fNorm) ||
        fSingular.includes(cleanSingular) ||
        cleanSingular.includes(fSingular) ||
        f.aliases.some(a => {
          const aNorm = normalizeNutritionText(a);
          return (
            aNorm.includes(clean) ||
            clean.includes(aNorm) ||
            normalizePluralPhrase(a).includes(cleanSingular)
          );
        })
      );
    });

    return partial || null;
  }

  /**
   * Search foods by text query and category with accents & plural normalization
   */
  static searchFoods(query: string, category?: string): NutritionalDatabaseItem[] {
    const clean = normalizeNutritionText(query);
    const cleanSingular = normalizePluralPhrase(query);

    return FOOD_DATABASE.filter(f => {
      const matchCat = !category || category === 'Todos' || f.category === category;
      if (!matchCat) return false;
      if (!clean) return true;

      const fNorm = normalizeNutritionText(f.name);
      const fSingular = normalizePluralPhrase(f.name);
      const catNorm = normalizeNutritionText(f.category);

      return (
        fNorm.includes(clean) ||
        fSingular.includes(cleanSingular) ||
        f.aliases.some(a => {
          const aNorm = normalizeNutritionText(a);
          return aNorm.includes(clean) || normalizePluralPhrase(a).includes(cleanSingular);
        }) ||
        catNorm.includes(clean)
      );
    });
  }

  /**
   * Looks up a food with confidence level and tier
   */
  static findFoodWithConfidence(query: string): {
    item: NutritionalDatabaseItem;
    confidence: number;
    tier: 'HIGH' | 'MEDIUM' | 'LOW';
  } | null {
    if (!query) return null;
    const clean = normalizeNutritionText(query);
    const cleanSingular = normalizePluralPhrase(query);

    // 1. Exact match on normalized name (HIGH confidence)
    const exact = FOOD_DATABASE.find(f => {
      const fNorm = normalizeNutritionText(f.name);
      return fNorm === clean || fNorm === cleanSingular;
    });
    if (exact) return { item: exact, confidence: 0.98, tier: 'HIGH' };

    // 2. Exact match on aliases (HIGH confidence)
    const aliasMatch = FOOD_DATABASE.find(f =>
      f.aliases.some(a => {
        const aNorm = normalizeNutritionText(a);
        return aNorm === clean || aNorm === cleanSingular;
      })
    );
    if (aliasMatch) return { item: aliasMatch, confidence: 0.92, tier: 'HIGH' };

    // 3. Inclusion match on food name (MEDIUM confidence)
    const normalizedMatch = FOOD_DATABASE.find(f => {
      const fNorm = normalizeNutritionText(f.name);
      const fSingular = normalizePluralPhrase(f.name);
      return (
        fNorm.includes(clean) ||
        clean.includes(fNorm) ||
        fSingular.includes(cleanSingular) ||
        cleanSingular.includes(fSingular)
      );
    });
    if (normalizedMatch) return { item: normalizedMatch, confidence: 0.78, tier: 'MEDIUM' };

    // 4. Alias inclusion match (MEDIUM-LOW confidence)
    const partialAlias = FOOD_DATABASE.find(f =>
      f.aliases.some(a => {
        const aNorm = normalizeNutritionText(a);
        return (
          aNorm.includes(clean) ||
          clean.includes(aNorm) ||
          normalizePluralPhrase(a).includes(cleanSingular)
        );
      })
    );
    if (partialAlias) return { item: partialAlias, confidence: 0.65, tier: 'MEDIUM' };

    return null;
  }

  /**
   * Enriches AI identified foods with real verified data from the database.
   * If a food is not found, or its unit is unknown, it is reported transparently
   * requiring user confirmation instead of silently defaulting to 1 g.
   */
  static enrichIdentifiedFoods(identifiedFoods: IdentifiedFoodFromAI[]): {
    calculatedFoods: FoodItem[];
    unmatchedFoods: string[];
  } {
    const calculatedFoods: FoodItem[] = [];
    const unmatchedFoods: string[] = [];

    for (const item of identifiedFoods) {
      const match = this.findFoodWithConfidence(item.name);

      if (match) {
        const dbMatch = match.item;
        const measure = resolveHouseholdMeasure(item.unit, item.estimatedQuantity, dbMatch);

        if (!measure.recognized || measure.requiresConfirmation) {
          // Unknown unit NEVER becomes 1 g; prompts user confirmation!
          unmatchedFoods.push(
            `${item.name} (${item.estimatedQuantity} ${item.unit || 'sem unidade'} — unidade não reconhecida, confirme a quantidade em gramas)`
          );
          continue;
        }

        const calculated = NutritionCalculator.calculateFromDbItem(
          dbMatch,
          measure.gramsOrMl,
          item.unit || 'g',
          match.confidence,
          item.estimatedQuantity,
          item.unit || 'g'
        );
        calculatedFoods.push(calculated);
      } else {
        unmatchedFoods.push(item.name);
      }
    }

    return { calculatedFoods, unmatchedFoods };
  }
}
