import React, { useState } from 'react';
import { WeightLog, HabitState, NutritionGoals } from '../types';
import { 
  TrendingUp, 
  Plus, 
  Check, 
  Droplet, 
  Apple, 
  Utensils, 
  Activity, 
  Moon, 
  AlertCircle, 
  Sparkles,
  Heart
} from 'lucide-react';

interface ProgressViewProps {
  weights: WeightLog[];
  habits: HabitState;
  goals: NutritionGoals;
  onAddWeight: (weight: number, date: string, note?: string) => void;
  onToggleHabit: (key: keyof HabitState) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  weights,
  habits,
  goals,
  onAddWeight,
  onToggleHabit,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weightKg : 65.4;
  const initialWeight = weights.length > 0 ? weights[0].weightKg : 66.8;
  const weightDiff = Number((latestWeight - initialWeight).toFixed(1));

  const handleSaveWeight = () => {
    const val = parseFloat(newWeight.replace(',', '.'));
    if (!isNaN(val) && val > 20 && val < 300) {
      onAddWeight(val, weightDate);
      setNewWeight('');
      setShowAddWeight(false);
    }
  };

  // SVG Weight trend line calculation
  const renderWeightChart = () => {
    if (weights.length < 2) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-slate-500">
          Registre mais pesagens para traçar a curva de tendência.
        </div>
      );
    }

    const minWeight = Math.min(...weights.map(w => w.weightKg)) - 1;
    const maxWeight = Math.max(...weights.map(w => w.weightKg)) + 1;
    const range = maxWeight - minWeight || 1;

    const points = weights
      .map((w, idx) => {
        const x = (idx / (weights.length - 1)) * 300 + 10;
        const y = 120 - ((w.weightKg - minWeight) / range) * 90;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="relative pt-2">
        <svg viewBox="0 0 320 140" className="w-full h-32 overflow-visible">
          {/* Subtle grid lines */}
          <line x1="10" y1="30" x2="310" y2="30" stroke="#334155" strokeDasharray="3 3" />
          <line x1="10" y1="75" x2="310" y2="75" stroke="#334155" strokeDasharray="3 3" />
          <line x1="10" y1="120" x2="310" y2="120" stroke="#334155" strokeDasharray="3 3" />

          {/* Trend Polyline */}
          <polyline
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Dots */}
          {weights.map((w, idx) => {
            const x = (idx / (weights.length - 1)) * 300 + 10;
            const y = 120 - ((w.weightKg - minWeight) / range) * 90;
            return (
              <g key={w.id || idx}>
                <circle cx={x} cy={y} r="4" fill="#f97316" stroke="#0f172a" strokeWidth="2" />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="600"
                >
                  {w.weightKg}kg
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-5 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Meu Progresso</h2>
          <p className="text-xs text-slate-400">Tendências e constância ao longo do tempo</p>
        </div>
        <div className="flex bg-slate-800 rounded-xl p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              period === '7d' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7d
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              period === '30d' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            30d
          </button>
          <button
            type="button"
            onClick={() => setPeriod('90d')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              period === '90d' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            90d
          </button>
        </div>
      </div>

      {/* Weight Tracking Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Acompanhamento de Peso
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-100">{latestWeight}</span>
              <span className="text-xs text-slate-400 font-semibold">kg</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  weightDiff <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {weightDiff > 0 ? `+${weightDiff}` : `${weightDiff}`} kg no histórico
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddWeight(!showAddWeight)}
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Registrar Peso
          </button>
        </div>

        {/* Form to add weight */}
        {showAddWeight && (
          <div className="bg-slate-800/80 border border-orange-500/30 rounded-2xl p-3.5 space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-slate-200">Novo registro de peso</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Peso (kg):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  placeholder="Ex: 65.5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Data:</label>
                <input
                  type="date"
                  value={weightDate}
                  onChange={e => setWeightDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddWeight(false)}
                className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveWeight}
                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs rounded-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Visual Line Chart */}
        {renderWeightChart()}

        {/* Non-punitive Reassuring Message */}
        <div className="p-3 bg-slate-850/80 rounded-2xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Heart size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <b>Lembrete da Calu:</b> Não é necessário pesar-se diariamente. O peso corporal oscila naturalmente devido à retenção de água, digestão e rotina. O foco é a constância e seu bem-estar!
          </p>
        </div>
      </div>

      {/* Daily Habits Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Acompanhamento de Hábitos
            </h3>
            <p className="text-[11px] text-slate-400">Ative os hábitos que fazem sentido para você</p>
          </div>
          <span className="text-xs font-bold text-orange-400">
            {Object.values(habits).filter(Boolean).length}/5
          </span>
        </div>

        <div className="space-y-2">
          {/* 1. Água */}
          <div
            onClick={() => onToggleHabit('waterGoalMet')}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              habits.waterGoalMet
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                <Droplet size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Meta de Água</h4>
                <p className="text-[10px] text-slate-400">Consumir {(goals.waterMl / 1000).toFixed(1)}L de água pura</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                habits.waterGoalMet ? 'bg-cyan-400 text-slate-950 font-bold' : 'border border-slate-700'
              }`}
            >
              {habits.waterGoalMet && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 2. Frutas e Vegetais */}
          <div
            onClick={() => onToggleHabit('fruitVeggieMet')}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              habits.fruitVeggieMet
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Apple size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Frutas & Vegetais</h4>
                <p className="text-[10px] text-slate-400">Incluir saladas ou frutas no dia</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                habits.fruitVeggieMet ? 'bg-emerald-400 text-slate-950 font-bold' : 'border border-slate-700'
              }`}
            >
              {habits.fruitVeggieMet && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 3. Refeições principais */}
          <div
            onClick={() => onToggleHabit('threeMealsMet')}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              habits.threeMealsMet
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                <Utensils size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Refeições Estruturadas</h4>
                <p className="text-[10px] text-slate-400">Registrar pelo menos 3 refeições</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                habits.threeMealsMet ? 'bg-orange-400 text-slate-950 font-bold' : 'border border-slate-700'
              }`}
            >
              {habits.threeMealsMet && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 4. Atividade física */}
          <div
            onClick={() => onToggleHabit('exerciseMet')}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              habits.exerciseMet
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Movimento & Atividade</h4>
                <p className="text-[10px] text-slate-400">Caminhada, treino ou esporte</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                habits.exerciseMet ? 'bg-rose-400 text-slate-950 font-bold' : 'border border-slate-700'
              }`}
            >
              {habits.exerciseMet && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 5. Sono reparador */}
          <div
            onClick={() => onToggleHabit('goodSleepMet')}
            className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              habits.goodSleepMet
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                <Moon size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Sono Reparador</h4>
                <p className="text-[10px] text-slate-400">7 a 8 horas de descanso de qualidade</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                habits.goodSleepMet ? 'bg-indigo-400 text-slate-950 font-bold' : 'border border-slate-700'
              }`}
            >
              {habits.goodSleepMet && <Check size={14} strokeWidth={3} />}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly AI Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-orange-400" />
          <h4 className="text-xs font-bold text-slate-200">Resumo da Semana com a Calu</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">
          "Você registrou refeições com consistência em 6 dos últimos 7 dias. Seu consumo de proteína se manteve estável e o consumo de água teve uma melhora notável nos dias úteis!"
        </p>
      </div>
    </div>
  );
};
