import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  PenLine, 
  Search, 
  Barcode, 
  Droplet, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  Flame, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { Meal, NutritionGoals, HabitState, UserProfile } from '../types';
import { CaluMascot } from '../components/CaluMascot';
import { CaluApiService } from '../services/api';

interface HomeViewProps {
  user: UserProfile;
  goals: NutritionGoals;
  meals: Meal[];
  waterMl: number;
  habits: HabitState;
  onAddWater: (delta: number) => void;
  onOpenPhoto: () => void;
  onOpenVoice: () => void;
  onOpenText: () => void;
  onOpenSearch: () => void;
  onOpenBarcode: () => void;
  onOpenCoach: () => void;
  onNavigateToDiary: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  goals,
  meals,
  waterMl,
  habits,
  onAddWater,
  onOpenPhoto,
  onOpenVoice,
  onOpenText,
  onOpenSearch,
  onOpenBarcode,
  onOpenCoach,
  onNavigateToDiary,
}) => {
  // Aggregate real daily nutrients from meals
  const totalCalories = meals.reduce((acc, m) => acc + (m.totalCalories || 0), 0);
  const totalProtein = Number(meals.reduce((acc, m) => acc + (m.totalProtein || 0), 0).toFixed(1));
  const totalCarbs = Number(meals.reduce((acc, m) => acc + (m.totalCarbohydrates || 0), 0).toFixed(1));
  const totalFat = Number(meals.reduce((acc, m) => acc + (m.totalFat || 0), 0).toFixed(1));

  const [dailyInsight, setDailyInsight] = useState<string>(
    meals.length === 0
      ? 'Comece seu dia registrando sua primeira refeição ou copo d’água! A Calu acompanha você sem julgamentos.'
      : 'Hoje seu ritmo de acompanhamento está ótimo! Você já registrou as principais refeições do seu dia.'
  );
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const insight = await CaluApiService.getDailyInsight(meals, goals, habits);
      setDailyInsight(insight);
    } catch {
      // Keep existing
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (meals.length > 0) {
      fetchInsight();
    }
  }, [meals.length]);

  const caloriePercent = Math.min(100, Math.round((totalCalories / (goals.calories || 2000)) * 100));
  const proteinPercent = Math.min(100, Math.round((totalProtein / (goals.protein || 120)) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbs / (goals.carbohydrates || 230)) * 100));
  const fatPercent = Math.min(100, Math.round((totalFat / (goals.fat || 65)) * 100));
  const waterPercent = Math.min(100, Math.round((waterMl / (goals.waterMl || 2500)) * 100));

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-5 animate-fadeIn">
      {/* Subtitle / Day status */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">Como está sua alimentação hoje?</p>
        <span className="text-[11px] text-orange-400/90 bg-orange-500/10 px-2 py-0.5 rounded-full font-semibold">
          {meals.length} {meals.length === 1 ? 'refeição' : 'refeições'} hoje
        </span>
      </div>

      {/* Main Calories & Macros Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flame size={14} className="text-orange-400" /> Calorias
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-100">{totalCalories}</span>
              <span className="text-xs text-slate-400 font-medium">/ {goals.calories} kcal</span>
            </div>
          </div>

          {/* Calorie Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="url(#calorieGradient)"
                strokeWidth="3.5"
                strokeDasharray={`${caloriePercent * 0.942}, 100`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-200">
              {caloriePercent}%
            </span>
          </div>
        </div>

        {/* Macros Progress Bars */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Proteína</span>
              <span className="text-[10px] text-emerald-400 font-bold">{totalProtein}g</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 block">meta: {goals.protein}g</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Carbos</span>
              <span className="text-[10px] text-amber-400 font-bold">{totalCarbs}g</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 block">meta: {goals.carbohydrates}g</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Gorduras</span>
              <span className="text-[10px] text-rose-400 font-bold">{totalFat}g</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full transition-all duration-500"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 block">meta: {goals.fat}g</span>
          </div>
        </div>
      </div>

      {/* Water Tracking Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Droplet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200">Água</span>
              <span className="text-[10px] text-cyan-400 font-semibold">{waterPercent}%</span>
            </div>
            <p className="text-xs text-slate-400">
              <b className="text-slate-100 font-bold">{(waterMl / 1000).toFixed(1)}</b> de{' '}
              {(goals.waterMl / 1000).toFixed(1)} L
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAddWater(250)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-bold border border-slate-700/60 active:scale-95 transition-transform"
          >
            +250ml
          </button>
          <button
            type="button"
            onClick={() => onAddWater(500)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-bold border border-slate-700/60 active:scale-95 transition-transform"
          >
            +500ml
          </button>
        </div>
      </div>

      {/* 5 Big Action Buttons */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Registrar Refeição
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenPhoto}
            className="col-span-2 p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 flex items-center justify-between shadow-lg shadow-orange-500/20 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-950/20 text-slate-950">
                <Camera size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-extrabold tracking-tight">Fotografar refeição</h4>
                <p className="text-[11px] font-medium text-slate-950/80">
                  Identificação com IA e cálculo pela base TACO
                </p>
              </div>
            </div>
            <Sparkles size={18} className="text-slate-950 group-hover:rotate-12 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onOpenVoice}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center gap-2.5 text-left active:scale-98 transition-all group"
          >
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 group-hover:bg-orange-500/25">
              <Mic size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Falar</h4>
              <p className="text-[10px] text-slate-400">Diga o que comeu</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenText}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center gap-2.5 text-left active:scale-98 transition-all group"
          >
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 group-hover:bg-orange-500/25">
              <PenLine size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Descrever</h4>
              <p className="text-[10px] text-slate-400">Escreva em texto</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center gap-2.5 text-left active:scale-98 transition-all group"
          >
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25">
              <Search size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Buscar</h4>
              <p className="text-[10px] text-slate-400">Tabela TACO oficial</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenBarcode}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center gap-2.5 text-left active:scale-98 transition-all group"
          >
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25">
              <Barcode size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Código de Barras</h4>
              <p className="text-[10px] text-slate-400">Embalados (EAN-13)</p>
            </div>
          </button>
        </div>
      </div>

      {/* Insight da Calu Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-orange-500/20 relative shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CaluMascot size="sm" mood="happy" />
            <span className="text-xs font-bold text-orange-400">Insight da Calu</span>
          </div>
          <button
            type="button"
            onClick={fetchInsight}
            disabled={loadingInsight}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
            title="Atualizar insight"
          >
            <RefreshCw size={13} className={loadingInsight ? 'animate-spin' : ''} />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic">
          "{dailyInsight}"
        </p>

        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {meals.length > 0 ? 'Baseado no seu diário de hoje' : 'Sem dados registrados hoje'}
          </span>
          <button
            type="button"
            onClick={onOpenCoach}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1"
          >
            <span>Conversar com a Calu</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Today's Latest Registered Meals */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Refeições de Hoje
          </h3>
          <button
            type="button"
            onClick={onNavigateToDiary}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
          >
            <span>Ver diário</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {meals.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
            <span className="text-2xl block">🍽️</span>
            <p className="text-xs font-medium text-slate-300">
              Nenhuma refeição registrada hoje ainda.
            </p>
            <p className="text-[11px] text-slate-500">
              Tire uma foto, fale ou descreva sua comida para começar!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.slice(0, 3).map(meal => (
              <div
                key={meal.id}
                onClick={onNavigateToDiary}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                    {meal.mealType === 'breakfast' && '☕'}
                    {meal.mealType === 'lunch' && '🍽️'}
                    {meal.mealType === 'snack' && '🥪'}
                    {meal.mealType === 'dinner' && '🍲'}
                    {meal.mealType === 'supper' && '🥛'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{meal.name}</h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock size={11} className="text-slate-500" />
                      <span>{meal.time}</span>
                      <span>•</span>
                      <span>{meal.foods.length} {meal.foods.length === 1 ? 'item' : 'itens'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-orange-400">
                    {meal.totalCalories} kcal
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {meal.totalProtein}g prot
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
