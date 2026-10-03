import React, { useState } from 'react';
import { FoodItem, Meal, MealType, MealAnalysisSuccessResponse } from '../types';
import { Check, X, Plus, Minus, Trash2, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { NutritionService } from '../services/nutritionService';
import { NutritionCalculator } from '../services/nutritionCalculator';
import { DateService } from '../services/dateService';

interface HumanCorrectionModalProps {
  initialData: MealAnalysisSuccessResponse;
  photoUrl?: string;
  uid: string;
  onSave: (meal: Meal) => void;
  onClose: () => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Café da manhã', icon: '☕' },
  { type: 'lunch', label: 'Almoço', icon: '🍽️' },
  { type: 'snack', label: 'Lanche', icon: '🥪' },
  { type: 'dinner', label: 'Jantar', icon: '🍲' },
  { type: 'supper', label: 'Ceia', icon: '🥛' },
];

const COMMON_UNITS = ['g', 'ml', 'unidade', 'fatia', 'colher de sopa', 'concha', 'xícara', 'porção'];

export const HumanCorrectionModal: React.FC<HumanCorrectionModalProps> = ({
  initialData,
  photoUrl,
  uid,
  onSave,
  onClose,
}) => {
  const [mealType, setMealType] = useState<MealType>(initialData.mealType || 'lunch');
  const [mealName, setMealName] = useState<string>(
    initialData.mealNameSuggestion || 'Minha Refeição'
  );

  const [foods, setFoods] = useState<FoodItem[]>(() => initialData.calculatedFoods || []);

  // Manual Add Food States
  const [showAddInline, setShowAddInline] = useState(false);
  const [newFoodQuery, setNewFoodQuery] = useState('');
  const [notFoundAlert, setNotFoundAlert] = useState(false);

  // Manual Nutritional Input Sub-form
  const [showCustomNutrientForm, setShowCustomNutrientForm] = useState(false);
  const [customCalories, setCustomCalories] = useState('100');
  const [customProtein, setCustomProtein] = useState('5.0');
  const [customCarbs, setCustomCarbs] = useState('15.0');
  const [customFat, setCustomFat] = useState('2.0');

  // Portion change
  const updatePortion = (id: string, delta: number) => {
    setFoods(prev =>
      prev.map(food => {
        if (food.id !== id) return food;
        const step = food.unit === 'g' || food.unit === 'ml' ? 25 : 1;
        const newQty = Math.max(1, food.estimatedQuantity + delta * step);
        return NutritionCalculator.rescaleFoodItem(food, newQty);
      })
    );
  };

  const applyPresetSize = (id: string, factor: number) => {
    setFoods(prev =>
      prev.map(food => {
        if (food.id !== id) return food;
        const newQty = Math.max(1, Math.round(food.estimatedQuantity * factor));
        return NutritionCalculator.rescaleFoodItem(food, newQty);
      })
    );
  };

  const removeFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
  };

  const updateUnit = (id: string, newUnit: string) => {
    setFoods(prev => prev.map(f => (f.id === id ? { ...f, unit: newUnit } : f)));
  };

  // Section 4: Deterministic manual food addition
  const handleSearchAndAdd = () => {
    if (!newFoodQuery.trim()) return;
    const dbMatch = NutritionService.findFood(newFoodQuery);

    if (dbMatch) {
      const calculated = NutritionCalculator.calculateFromDbItem(
        dbMatch,
        dbMatch.portionMultiplier,
        'g',
        1.0
      );
      setFoods(prev => [...prev, calculated]);
      setNewFoodQuery('');
      setShowAddInline(false);
      setNotFoundAlert(false);
    } else {
      setNotFoundAlert(true);
    }
  };

  const handleAddCustomNutrients = () => {
    if (!newFoodQuery.trim()) return;
    const customItem: FoodItem = {
      id: 'custom_' + Date.now(),
      name: newFoodQuery.trim(),
      estimatedQuantity: 100,
      unit: 'g',
      confidence: 1.0,
      calories: Math.max(0, parseInt(customCalories, 10) || 0),
      protein: Math.max(0, parseFloat(customProtein) || 0),
      carbohydrates: Math.max(0, parseFloat(customCarbs) || 0),
      fat: Math.max(0, parseFloat(customFat) || 0),
      fiber: 0,
      source: 'Informado manualmente pelo usuário',
    };
    setFoods(prev => [...prev, customItem]);
    setNewFoodQuery('');
    setShowAddInline(false);
    setShowCustomNutrientForm(false);
    setNotFoundAlert(false);
  };

  // Human confidence label formatting (Section 33: No false precision)
  const formatConfidence = (conf?: number) => {
    if (!conf) return 'Estimado';
    if (conf >= 0.85) return 'Alta certeza';
    if (conf >= 0.6) return 'Média certeza';
    return 'Baixa certeza';
  };

  // Calculated totals
  const totals = NutritionCalculator.calculateTotals(foods);

  const handleConfirm = () => {
    if (foods.length === 0) {
      alert('Adicione ao menos um alimento à refeição.');
      return;
    }

    const meal: Meal = {
      id: 'meal_' + Date.now(),
      uid,
      name: mealName.trim() || 'Refeição Registrada',
      mealType,
      time: DateService.getLocalTime(),
      date: DateService.getLocalDate(),
      timestamp: DateService.getLocalDateTime(),
      foods,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbohydrates: totals.carbohydrates,
      totalFat: totals.fat,
      totalFiber: totals.fiber,
      photoUrl,
      uncertainties: initialData.uncertainties || [],
      userConfirmed: true, // Marked confirmed by human
      createdAt: DateService.getLocalDateTime(),
      updatedAt: DateService.getLocalDateTime(),
    };

    onSave(meal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Confira sua refeição</h2>
              <p className="text-xs text-slate-400">Os valores são estimativas e podem variar.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {photoUrl && (
            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950">
              <img src={photoUrl} alt="Refeição" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Meal Type & Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Momento da Refeição</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setMealType(m.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    mealType === m.type
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="Nome da refeição"
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Totals Strip */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Calculado</span>
              <span className="text-lg font-black text-orange-400">
                {totals.calories} <span className="text-xs font-normal text-slate-300">kcal</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Proteína</span>
                <span className="text-xs font-bold text-emerald-400">{totals.protein}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Carboidratos</span>
                <span className="text-xs font-bold text-amber-400">{totals.carbohydrates}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Gorduras</span>
                <span className="text-xs font-bold text-rose-400">{totals.fat}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Fibras</span>
                <span className="text-xs font-bold text-teal-400">{totals.fiber}g</span>
              </div>
            </div>
          </div>

          {/* Uncertainties */}
          {initialData.uncertainties && initialData.uncertainties.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300/90 flex gap-2 items-start">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Estimativas visuais da IA:</p>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-amber-200/80">
                  {initialData.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Food List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alimentos ({foods.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddInline(!showAddInline)}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
              >
                <Plus size={14} /> Adicionar alimento
              </button>
            </div>

            {/* Inline Add Food Search (Problem Critical #2) */}
            {showAddInline && (
              <div className="bg-slate-800 border border-orange-500/40 rounded-2xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-slate-200">
                  Buscar alimento na base TACO:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFoodQuery}
                    onChange={e => {
                      setNewFoodQuery(e.target.value);
                      setNotFoundAlert(false);
                    }}
                    placeholder="Ex: Arroz, Feijão, Frango..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    onKeyDown={e => e.key === 'Enter' && handleSearchAndAdd()}
                  />
                  <button
                    type="button"
                    onClick={handleSearchAndAdd}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Buscar
                  </button>
                </div>

                {notFoundAlert && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs text-amber-300">
                    <p>Não encontramos esse alimento na nossa base.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNotFoundAlert(false)}
                        className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-[11px] font-semibold"
                      >
                        Pesquisar novamente
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomNutrientForm(true)}
                        className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-[11px] font-bold"
                      >
                        Informar dados nutricionais
                      </button>
                    </div>
                  </div>
                )}

                {showCustomNutrientForm && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <p className="font-semibold text-slate-200">Informar valores aproximados (porção de 100g):</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Kcal:</label>
                        <input
                          type="number"
                          value={customCalories}
                          onChange={e => setCustomCalories(e.target.value)}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Prot (g):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customProtein}
                          onChange={e => setCustomProtein(e.target.value)}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Carb (g):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customCarbs}
                          onChange={e => setCustomCarbs(e.target.value)}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Gord (g):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customFat}
                          onChange={e => setCustomFat(e.target.value)}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomNutrients}
                      className="w-full py-1.5 bg-orange-500 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Inserir alimento
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Food Cards */}
            {foods.map(food => (
              <div
                key={food.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{food.name}</h4>
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1 mt-0.5">
                      <BookOpen size={11} className="text-orange-400" />
                      {food.source || 'TACO (NEPA/UNICAMP)'} • {formatConfidence(food.confidence)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400 whitespace-nowrap">
                      {food.calories} kcal
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFood(food.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg"
                      title="Remover alimento"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Portion controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updatePortion(food.id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-sm border border-slate-700"
                    >
                      <Minus size={14} />
                    </button>

                    <div className="px-2 py-1 min-w-[55px] text-center font-bold text-sm text-slate-100">
                      {food.estimatedQuantity}
                    </div>

                    <button
                      type="button"
                      onClick={() => updatePortion(food.id, 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-sm border border-slate-700"
                    >
                      <Plus size={14} />
                    </button>

                    <select
                      value={food.unit}
                      onChange={e => updateUnit(food.id, e.target.value)}
                      className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-orange-500 ml-1"
                    >
                      {COMMON_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => applyPresetSize(food.id, 0.75)}
                      className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    >
                      Pequeno
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSize(food.id, 1.0)}
                      className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    >
                      Médio
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSize(food.id, 1.35)}
                      className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    >
                      Grande
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 text-[10px] text-slate-400 px-1">
                  <span>Prot: <b className="text-slate-200">{food.protein}g</b></span>
                  <span>Carb: <b className="text-slate-200">{food.carbohydrates}g</b></span>
                  <span>Gord: <b className="text-slate-200">{food.fat}g</b></span>
                  <span>Fibras: <b className="text-slate-200">{food.fiber}g</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-2 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Check size={18} strokeWidth={3} />
            <span>Confirmar refeição</span>
          </button>
        </div>
      </div>
    </div>
  );
};
