import React, { useState } from 'react';
import { FoodItem, Meal, MealType, MealAnalysisResponse } from '../types';
import { Check, X, Plus, Minus, Trash2, AlertCircle, Sparkles, Utensils } from 'lucide-react';

interface HumanCorrectionModalProps {
  initialData: MealAnalysisResponse;
  photoUrl?: string;
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
  onSave,
  onClose,
}) => {
  const [mealType, setMealType] = useState<MealType>(initialData.mealType || 'lunch');
  const [mealName, setMealName] = useState<string>(
    initialData.mealNameSuggestion || 'Minha Refeição'
  );

  // Convert incoming foods to editable FoodItem array with unique IDs
  const [foods, setFoods] = useState<FoodItem[]>(() => {
    return initialData.foods.map((f, i) => ({
      id: 'food_item_' + Date.now() + '_' + i,
      name: f.name,
      estimatedQuantity: Number(f.estimatedQuantity) || 100,
      unit: f.unit || 'g',
      confidence: f.confidence || 0.85,
      calories: Math.round(Number(f.calories) || 0),
      protein: Number(Number(f.protein || 0).toFixed(1)),
      carbohydrates: Number(Number(f.carbohydrates || 0).toFixed(1)),
      fat: Number(Number(f.fat || 0).toFixed(1)),
      fiber: Number(Number(f.fiber || 0).toFixed(1)),
    }));
  });

  const [newFoodName, setNewFoodName] = useState('');
  const [showAddInline, setShowAddInline] = useState(false);

  // Handle portion change for an item
  const updatePortion = (id: string, delta: number) => {
    setFoods(prev =>
      prev.map(food => {
        if (food.id !== id) return food;
        const currentQty = food.estimatedQuantity;
        // Determine step based on unit
        const step = food.unit === 'g' || food.unit === 'ml' ? 25 : 1;
        const newQty = Math.max(1, currentQty + delta * step);
        const ratio = newQty / currentQty;

        return {
          ...food,
          estimatedQuantity: newQty,
          calories: Math.max(1, Math.round(food.calories * ratio)),
          protein: Number((food.protein * ratio).toFixed(1)),
          carbohydrates: Number((food.carbohydrates * ratio).toFixed(1)),
          fat: Number((food.fat * ratio).toFixed(1)),
          fiber: Number((food.fiber * ratio).toFixed(1)),
        };
      })
    );
  };

  // Set preset portion size
  const applyPresetSize = (id: string, factor: number) => {
    setFoods(prev =>
      prev.map(food => {
        if (food.id !== id) return food;
        const base = food.estimatedQuantity;
        const newQty = Math.max(1, Math.round(base * factor));
        const ratio = newQty / base;

        return {
          ...food,
          estimatedQuantity: newQty,
          calories: Math.max(1, Math.round(food.calories * ratio)),
          protein: Number((food.protein * ratio).toFixed(1)),
          carbohydrates: Number((food.carbohydrates * ratio).toFixed(1)),
          fat: Number((food.fat * ratio).toFixed(1)),
          fiber: Number((food.fiber * ratio).toFixed(1)),
        };
      })
    );
  };

  const removeFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
  };

  const updateUnit = (id: string, newUnit: string) => {
    setFoods(prev =>
      prev.map(f => (f.id === id ? { ...f, unit: newUnit } : f))
    );
  };

  const updateFoodName = (id: string, name: string) => {
    setFoods(prev => prev.map(f => (f.id === id ? { ...f, name } : f)));
  };

  const handleAddNewFood = () => {
    if (!newFoodName.trim()) return;
    const newItem: FoodItem = {
      id: 'food_item_' + Date.now(),
      name: newFoodName.trim(),
      estimatedQuantity: 100,
      unit: 'g',
      confidence: 1.0,
      calories: 120,
      protein: 5.0,
      carbohydrates: 15.0,
      fat: 2.0,
      fiber: 1.5,
    };
    setFoods(prev => [...prev, newItem]);
    setNewFoodName('');
    setShowAddInline(false);
  };

  // Dynamically compute totals
  const totalCalories = foods.reduce((acc, f) => acc + f.calories, 0);
  const totalProtein = Number(foods.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const totalCarbs = Number(foods.reduce((acc, f) => acc + f.carbohydrates, 0).toFixed(1));
  const totalFat = Number(foods.reduce((acc, f) => acc + f.fat, 0).toFixed(1));
  const totalFiber = Number(foods.reduce((acc, f) => acc + f.fiber, 0).toFixed(1));

  const handleConfirm = () => {
    if (foods.length === 0) {
      alert('Adicione pelo menos um alimento à refeição.');
      return;
    }

    const meal: Meal = {
      id: 'meal_' + Date.now(),
      name: mealName.trim() || 'Refeição Registrada',
      mealType,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      foods,
      totalCalories,
      totalProtein,
      totalCarbohydrates: totalCarbs,
      totalFat,
      totalFiber,
      photoUrl,
      uncertainties: initialData.uncertainties || [],
      createdAt: new Date().toISOString(),
    };

    onSave(meal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Confira sua refeição</h2>
              <p className="text-xs text-slate-400">Ajuste porções e confirme antes de salvar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Optional Photo Thumbnail preview */}
          {photoUrl && (
            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950">
              <img
                src={photoUrl}
                alt="Foto da refeição"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-medium text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-slate-700">
                  📸 Foto analisada com IA multimodal
                </span>
              </div>
            </div>
          )}

          {/* Meal Name & Category Selector */}
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
              placeholder="Nome da refeição (ex: Almoço com frango)"
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Dynamic Totals Strip */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-slate-700/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Estimado</span>
              <span className="text-lg font-black text-orange-400">
                {totalCalories} <span className="text-xs font-normal text-slate-300">kcal</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Proteína</span>
                <span className="text-xs font-bold text-emerald-400">{totalProtein}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Carboidratos</span>
                <span className="text-xs font-bold text-amber-400">{totalCarbs}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Gorduras</span>
                <span className="text-xs font-bold text-rose-400">{totalFat}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Fibras</span>
                <span className="text-xs font-bold text-teal-400">{totalFiber}g</span>
              </div>
            </div>
          </div>

          {/* Uncertainties / Transparency Disclaimer */}
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

          {/* Foods List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alimentos Identificados ({foods.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddInline(!showAddInline)}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
              >
                <Plus size={14} /> Adicionar alimento
              </button>
            </div>

            {/* Inline Add Item Form */}
            {showAddInline && (
              <div className="bg-slate-800/90 border border-orange-500/30 rounded-xl p-3 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Novo alimento:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFoodName}
                    onChange={e => setNewFoodName(e.target.value)}
                    placeholder="Ex: 1 maçã ou 1 colher de farofa"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    onKeyDown={e => e.key === 'Enter' && handleAddNewFood()}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewFood}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Food Cards */}
            {foods.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhum alimento na lista. Clique em "Adicionar alimento" acima.
              </div>
            ) : (
              foods.map(food => (
                <div
                  key={food.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={food.name}
                      onChange={e => updateFoodName(food.id, e.target.value)}
                      className="bg-transparent font-semibold text-sm text-slate-100 focus:outline-none focus:underline flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-400 whitespace-nowrap">
                        {food.calories} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFood(food.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                        title="Remover alimento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Quantity & Unit Stepper */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePortion(food.id, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-sm border border-slate-700"
                        title="Diminuir porção"
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
                        title="Aumentar porção"
                      >
                        <Plus size={14} />
                      </button>

                      {/* Unit Selector */}
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

                    {/* Quick Portion Size Presets */}
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

                  {/* Nutrients per item breakdown */}
                  <div className="flex gap-3 text-[10px] text-slate-400 px-1">
                    <span>Prot: <b className="text-slate-200">{food.protein}g</b></span>
                    <span>Carb: <b className="text-slate-200">{food.carbohydrates}g</b></span>
                    <span>Gord: <b className="text-slate-200">{food.fat}g</b></span>
                    <span>Fibras: <b className="text-slate-200">{food.fiber}g</b></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer Confirmation */}
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
