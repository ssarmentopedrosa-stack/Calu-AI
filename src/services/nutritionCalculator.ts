import { NutritionalDatabaseItem, FoodItem } from '../types';

export class NutritionCalculator {
  /**
   * Deterministically calculates macro and micronutrients based on exact weight in grams/ml
   * using the formula: (valuePer100g * quantityInGrams) / 100
   */
  static calculateFromDbItem(
    dbItem: NutritionalDatabaseItem,
    quantityInGramsOrMl: number,
    unit: string,
    confidence = 1.0,
    originalQuantity?: number,
    originalUnit?: string
  ): FoodItem {
    const qty = Math.max(0, quantityInGramsOrMl);
    const ratio = qty / 100;

    const rawCalories = dbItem.caloriesPer100g * ratio;
    const rawProtein = dbItem.proteinPer100g * ratio;
    const rawCarbs = dbItem.carbsPer100g * ratio;
    const rawFat = dbItem.fatPer100g * ratio;
    const rawFiber = dbItem.fiberPer100g * ratio;

    const confidenceTier = confidence >= 0.85 ? 'HIGH' : confidence >= 0.60 ? 'MEDIUM' : 'LOW';

    return {
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: dbItem.name,
      estimatedQuantity: originalQuantity !== undefined ? originalQuantity : qty,
      unit: originalUnit || unit || 'g',
      normalizedQuantity: qty,
      normalizedUnit: 'g',
      confidence,
      confidenceTier,
      calories: Math.round(rawCalories),
      protein: Number(rawProtein.toFixed(1)),
      carbohydrates: Number(rawCarbs.toFixed(1)),
      fat: Number(rawFat.toFixed(1)),
      fiber: Number(rawFiber.toFixed(1)),
      source: dbItem.source,
      dbFoodId: dbItem.id,
    };
  }

  /**
   * Recalculates nutrients when user modifies portion on an existing food item
   */
  static rescaleFoodItem(existing: FoodItem, newQuantity: number): FoodItem {
    const oldQty = existing.estimatedQuantity || 1;
    const newQty = Math.max(1, newQuantity);
    const scale = newQty / oldQty;

    return {
      ...existing,
      estimatedQuantity: newQty,
      calories: Math.max(1, Math.round(existing.calories * scale)),
      protein: Number((existing.protein * scale).toFixed(1)),
      carbohydrates: Number((existing.carbohydrates * scale).toFixed(1)),
      fat: Number((existing.fat * scale).toFixed(1)),
      fiber: Number((existing.fiber * scale).toFixed(1)),
    };
  }

  /**
   * Aggregates total macronutrients for a list of foods
   */
  static calculateTotals(foods: FoodItem[]) {
    return {
      calories: foods.reduce((acc, f) => acc + (f.calories || 0), 0),
      protein: Number(foods.reduce((acc, f) => acc + (f.protein || 0), 0).toFixed(1)),
      carbohydrates: Number(foods.reduce((acc, f) => acc + (f.carbohydrates || 0), 0).toFixed(1)),
      fat: Number(foods.reduce((acc, f) => acc + (f.fat || 0), 0).toFixed(1)),
      fiber: Number(foods.reduce((acc, f) => acc + (f.fiber || 0), 0).toFixed(1)),
    };
  }
}
