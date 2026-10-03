import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Check, ChevronRight } from 'lucide-react';
import { BRAZILIAN_FOODS, BrazilianFood } from '../data/brazilianFoods';
import { FoodItem, Meal, MealType } from '../types';
import { AuthService } from '../services/authService';
import { DateService } from '../services/dateService';

interface SearchFoodModalProps {
  onAddMeal: (meal: Meal) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Todos',
  'Cereais e Grãos',
  'Carnes e Ovos',
  'Pratos Típicos',
  'Frutas e Legumes',
  'Laticínios',
  'Pães e Massas',
  'Bebidas',
];

export const SearchFoodModal: React.FC<SearchFoodModalProps> = ({ onAddMeal, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [basket, setBasket] = useState<FoodItem[]>([]);

  // Filter foods by search query and category
  const filteredFoods = useMemo(() => {
    return BRAZILIAN_FOODS.filter(food => {
      const matchCat =
        selectedCategory === 'Todos' || food.category === selectedCategory;
      const matchSearch =
        food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        food.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [searchTerm, selectedCategory]);

  const addToBasket = (food: BrazilianFood) => {
    const existingIndex = basket.findIndex(item => item.name === food.name);

    if (existingIndex >= 0) {
      setBasket(prev =>
        prev.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const newQty = item.estimatedQuantity + food.portionMultiplier;
          const ratio = newQty / 100;
          return {
            ...item,
            estimatedQuantity: newQty,
            calories: Math.round(food.caloriesPer100g * ratio),
            protein: Number((food.proteinPer100g * ratio).toFixed(1)),
            carbohydrates: Number((food.carbsPer100g * ratio).toFixed(1)),
            fat: Number((food.fatPer100g * ratio).toFixed(1)),
            fiber: Number((food.fiberPer100g * ratio).toFixed(1)),
          };
        })
      );
    } else {
      const qty = food.portionMultiplier;
      const ratio = qty / 100;
      const newItem: FoodItem = {
        id: 'basket_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: food.name,
        estimatedQuantity: qty,
        unit: 'g',
        confidence: 1.0,
        calories: Math.round(food.caloriesPer100g * ratio),
        protein: Number((food.proteinPer100g * ratio).toFixed(1)),
        carbohydrates: Number((food.carbsPer100g * ratio).toFixed(1)),
        fat: Number((food.fatPer100g * ratio).toFixed(1)),
        fiber: Number((food.fiberPer100g * ratio).toFixed(1)),
        source: 'TACO - Tabela Brasileira de Composição de Alimentos',
      };
      setBasket(prev => [...prev, newItem]);
    }
  };

  const removeFromBasket = (id: string) => {
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  const totalBasketCalories = basket.reduce((acc, f) => acc + f.calories, 0);
  const totalBasketProtein = Number(basket.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const totalBasketCarbs = Number(basket.reduce((acc, f) => acc + f.carbohydrates, 0).toFixed(1));
  const totalBasketFat = Number(basket.reduce((acc, f) => acc + f.fat, 0).toFixed(1));
  const totalBasketFiber = Number(basket.reduce((acc, f) => acc + f.fiber, 0).toFixed(1));

  const handleFinish = () => {
    if (basket.length === 0) return;

    const currentUid = AuthService.getCurrentUser()?.uid || 'usr_local_default';
    const nowIso = new Date().toISOString();

    const meal: Meal = {
      id: 'meal_search_' + Date.now(),
      uid: currentUid,
      name:
        basket.length === 1
          ? basket[0].name
          : `Refeição com ${basket[0].name} +${basket.length - 1}`,
      mealType: selectedMealType,
      time: DateService.getLocalTime(),
      date: DateService.getLocalDate(),
      timestamp: nowIso,
      foods: basket,
      totalCalories: totalBasketCalories,
      totalProtein: totalBasketProtein,
      totalCarbohydrates: totalBasketCarbs,
      totalFat: totalBasketFat,
      totalFiber: totalBasketFiber,
      userConfirmed: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onAddMeal(meal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Search size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Buscar Alimentos</h2>
              <p className="text-xs text-slate-400">Base nutricional com pratos do Brasil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input & Category Pills */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/60">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por arroz, feijão, tapioca, cuscuz..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
              autoFocus
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Food List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredFoods.map((food, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{food.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{food.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {food.standardUnit} •{' '}
                    <span className="text-orange-400 font-semibold">
                      {Math.round((food.caloriesPer100g * food.portionMultiplier) / 100)} kcal
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    P: {((food.proteinPer100g * food.portionMultiplier) / 100).toFixed(1)}g | C:{' '}
                    {((food.carbsPer100g * food.portionMultiplier) / 100).toFixed(1)}g | G:{' '}
                    {((food.fatPer100g * food.portionMultiplier) / 100).toFixed(1)}g
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addToBasket(food)}
                className="w-8 h-8 rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-slate-950 flex items-center justify-center font-bold transition-all active:scale-90"
                title="Adicionar à refeição"
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Selected Items Basket Drawer */}
        {basket.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Itens selecionados ({basket.length}):
              </span>
              <span className="font-extrabold text-orange-400 text-sm">
                {totalBasketCalories} kcal
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {basket.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shrink-0 text-xs"
                >
                  <span className="text-slate-200 font-medium">
                    {item.name} ({item.estimatedQuantity}g)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromBasket(item.id)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Destination Meal Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">Registrar em:</span>
              <select
                value={selectedMealType}
                onChange={e => setSelectedMealType(e.target.value as MealType)}
                className="bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-orange-500 flex-1"
              >
                <option value="breakfast">Café da manhã</option>
                <option value="lunch">Almoço</option>
                <option value="snack">Lanche</option>
                <option value="dinner">Jantar</option>
                <option value="supper">Ceia</option>
              </select>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={basket.length === 0}
            className={`flex-2 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              basket.length > 0
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Check size={16} strokeWidth={3} />
            <span>Salvar {basket.length} {basket.length === 1 ? 'item' : 'itens'} no Diário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
