import { FOOD_DATABASE } from '../data/foodDatabase';
import { NutritionalDatabaseItem, FoodItem, IdentifiedFoodFromAI } from '../types';
import { NutritionCalculator } from './nutritionCalculator';

export class NutritionService {
  /**
   * Looks up a food in the TACO food database matching either direct name or known aliases
   */
  static findFood(query: string): NutritionalDatabaseItem | null {
    if (!query) return null;
    const clean = query.trim().toLowerCase();

    // 1. Exact match on name
    const exact = FOOD_DATABASE.find(f => f.name.toLowerCase() === clean);
    if (exact) return exact;

    // 2. Exact match on aliases
    const aliasMatch = FOOD_DATABASE.find(f =>
      f.aliases.some(a => a.toLowerCase() === clean)
    );
    if (aliasMatch) return aliasMatch;

    // 3. Partial inclusion match
    const partial = FOOD_DATABASE.find(f => {
      const nameLower = f.name.toLowerCase();
      return nameLower.includes(clean) || clean.includes(nameLower) ||
        f.aliases.some(a => clean.includes(a.toLowerCase()) || a.toLowerCase().includes(clean));
    });

    return partial || null;
  }

  /**
   * Search foods by text query and category
   */
  static searchFoods(query: string, category?: string): NutritionalDatabaseItem[] {
    const clean = query.trim().toLowerCase();
    return FOOD_DATABASE.filter(f => {
      const matchCat = !category || category === 'Todos' || f.category === category;
      if (!matchCat) return false;
      if (!clean) return true;

      return (
        f.name.toLowerCase().includes(clean) ||
        f.aliases.some(a => a.toLowerCase().includes(clean)) ||
        f.category.toLowerCase().includes(clean)
      );
    });
  }

  /**
   * Enriches AI identified foods with real verified data from the database.
   * If a food is not found, it is reported transparently without inventing numbers.
   */
  static enrichIdentifiedFoods(identifiedFoods: IdentifiedFoodFromAI[]): {
    calculatedFoods: FoodItem[];
    unmatchedFoods: string[];
  } {
    const calculatedFoods: FoodItem[] = [];
    const unmatchedFoods: string[] = [];

    for (const item of identifiedFoods) {
      const dbMatch = this.findFood(item.name);

      if (dbMatch) {
        // Convert portions if unit is common Brazilian household measure
        let gramsOrMl = item.estimatedQuantity;
        if (item.unit === 'unidade' || item.unit === 'porção' || item.unit === 'fatia' || item.unit === 'concha' || item.unit === 'colher de sopa') {
          gramsOrMl = item.estimatedQuantity * dbMatch.portionMultiplier;
        }

        const calculated = NutritionCalculator.calculateFromDbItem(
          dbMatch,
          gramsOrMl,
          item.unit || 'g',
          item.confidence || 0.85
        );
        calculatedFoods.push(calculated);
      } else {
        unmatchedFoods.push(item.name);
      }
    }

    return { calculatedFoods, unmatchedFoods };
  }
}
