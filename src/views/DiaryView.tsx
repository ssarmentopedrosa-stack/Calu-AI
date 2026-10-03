import React, { useState } from 'react';
import { Meal, MealType } from '../types';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  Clock, 
  Flame, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface DiaryViewProps {
  meals: Meal[];
  onDeleteMeal: (id: string) => void;
  onDuplicateMeal: (id: string) => void;
  onEditMeal: (meal: Meal) => void;
  onAddMealForCategory: (type: MealType) => void;
}

const SECTIONS: { type: MealType; title: string; icon: string; defaultTime: string }[] = [
  { type: 'breakfast', title: 'Café da manhã', icon: '☕', defaultTime: '08:00' },
  { type: 'lunch', title: 'Almoço', icon: '🍽️', defaultTime: '12:30' },
  { type: 'snack', title: 'Lanche da tarde', icon: '🥪', defaultTime: '16:00' },
  { type: 'dinner', title: 'Jantar', icon: '🍲', defaultTime: '20:00' },
  { type: 'supper', title: 'Ceia', icon: '🥛', defaultTime: '22:30' },
];

export const DiaryView: React.FC<DiaryViewProps> = ({
  meals,
  onDeleteMeal,
  onDuplicateMeal,
  onEditMeal,
  onAddMealForCategory,
}) => {
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMeals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group meals by category
  const mealsByType: Record<MealType, Meal[]> = {
    breakfast: meals.filter(m => m.mealType === 'breakfast'),
    lunch: meals.filter(m => m.mealType === 'lunch'),
    snack: meals.filter(m => m.mealType === 'snack'),
    dinner: meals.filter(m => m.mealType === 'dinner'),
    supper: meals.filter(m => m.mealType === 'supper'),
  };

  // Overall daily totals
  const totalDayCalories = meals.reduce((acc, m) => acc + m.totalCalories, 0);
  const totalDayProtein = Number(meals.reduce((acc, m) => acc + m.totalProtein, 0).toFixed(1));
  const totalDayCarbs = Number(meals.reduce((acc, m) => acc + m.totalCarbohydrates, 0).toFixed(1));
  const totalDayFat = Number(meals.reduce((acc, m) => acc + m.totalFat, 0).toFixed(1));
  const totalDayFiber = Number(meals.reduce((acc, m) => acc + m.totalFiber, 0).toFixed(1));

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-5 animate-fadeIn">
      {/* Title & Daily Nutrients Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Meu Dia</h2>
          <p className="text-xs text-slate-400">Diário alimentar detalhado por refeição</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-extrabold text-orange-400">{totalDayCalories}</span>
          <span className="text-xs text-slate-400 font-normal"> kcal</span>
        </div>
      </div>

      {/* Summary Macro Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex justify-around text-center text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Proteína</span>
          <span className="font-bold text-emerald-400">{totalDayProtein}g</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Carbos</span>
          <span className="font-bold text-amber-400">{totalDayCarbs}g</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Gorduras</span>
          <span className="font-bold text-rose-400">{totalDayFat}g</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Fibras</span>
          <span className="font-bold text-teal-400">{totalDayFiber}g</span>
        </div>
      </div>

      {/* Meal Sections */}
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const sectionMeals = mealsByType[section.type] || [];
          const sectionCalories = sectionMeals.reduce((acc, m) => acc + m.totalCalories, 0);
          const sectionProtein = Number(sectionMeals.reduce((acc, m) => acc + m.totalProtein, 0).toFixed(1));

          return (
            <div
              key={section.type}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-md"
            >
              {/* Section Header */}
              <div className="p-4 flex items-center justify-between bg-slate-850/60 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {section.title}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {sectionMeals.length} {sectionMeals.length === 1 ? 'registro' : 'registros'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {sectionCalories > 0 && (
                    <div className="text-right">
                      <span className="text-xs font-bold text-orange-400">{sectionCalories} kcal</span>
                      <span className="text-[10px] text-slate-400 block">{sectionProtein}g prot</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onAddMealForCategory(section.type)}
                    className="p-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-slate-950 transition-colors"
                    title={`Adicionar ${section.title}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Section Meals List */}
              {sectionMeals.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-500 mb-2">Nenhum alimento registrado aqui ainda.</p>
                  <button
                    type="button"
                    onClick={() => onAddMealForCategory(section.type)}
                    className="text-xs text-orange-400 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Registrar {section.title.toLowerCase()}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {sectionMeals.map(meal => {
                    const isExpanded = Boolean(expandedMeals[meal.id]);

                    return (
                      <div key={meal.id} className="p-3.5 space-y-2">
                        {/* Meal Title Row */}
                        <div
                          onClick={() => toggleExpand(meal.id)}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                              {meal.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} className="text-slate-500" />
                              <span>{meal.time}</span>
                              <span>•</span>
                              <span>{meal.foods.length} {meal.foods.length === 1 ? 'item' : 'itens'}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-orange-400">
                              {meal.totalCalories} kcal
                            </span>
                            <div className="text-slate-500 group-hover:text-slate-300">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Food Details */}
                        {isExpanded && (
                          <div className="pt-2 space-y-2.5 border-t border-slate-800/60 animate-fadeIn">
                            {/* Photo Thumbnail if present */}
                            {meal.photoUrl && (
                              <img
                                src={meal.photoUrl}
                                alt="Foto"
                                className="w-full h-28 object-cover rounded-xl border border-slate-700/60"
                              />
                            )}

                            {/* Food items breakdown */}
                            <div className="space-y-1.5 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                              {meal.foods.map((food, fIdx) => (
                                <div
                                  key={food.id || fIdx}
                                  className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-none"
                                >
                                  <div>
                                    <span className="font-medium text-slate-200">{food.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-1.5">
                                      ({food.estimatedQuantity} {food.unit})
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-slate-200">
                                      {food.calories} kcal
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                      {food.protein}g prot
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Action Buttons: Edit, Duplicate, Delete */}
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => onDuplicateMeal(meal.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                title="Duplicar refeição"
                              >
                                <Copy size={13} />
                                <span>Duplicar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onEditMeal(meal)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                title="Editar refeição"
                              >
                                <Edit3 size={13} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteMeal(meal.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                title="Excluir refeição"
                              >
                                <Trash2 size={13} />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
