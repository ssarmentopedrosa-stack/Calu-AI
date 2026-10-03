import React, { useState } from 'react';
import { WeightLog, HabitState, NutritionGoals } from '../types';
import { 
  Plus, 
  Check, 
  Droplet, 
  Apple, 
  Utensils, 
  Activity, 
  Moon, 
  Sparkles,
  Heart,
  Scale
} from 'lucide-react';
import { DateService } from '../services/dateService';

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
  const [weightDate, setWeightDate] = useState(DateService.getLocalDate());

  const hasWeights = weights.length > 0;
  const latestWeight = hasWeights ? weights[weights.length - 1].weightKg : null;
  const initialWeight = hasWeights ? weights[0].weightKg : null;
  const weightDiff = (latestWeight && initialWeight) ? Number((latestWeight - initialWeight).toFixed(1)) : 0;

  const handleSaveWeight = () => {
    const val = parseFloat(newWeight.replace(',', '.'));
    if (!isNaN(val) && val > 20 && val < 300) {
      onAddWeight(val, weightDate);
      setNewWeight('');
      setShowAddWeight(false);
    }
  };

  const renderWeightChart = () => {
    if (!hasWeights || weights.length < 2) {
      return (
        <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-500 space-y-1.5 p-4 border border-dashed border-slate-800 rounded-2xl">
          <Scale size={24} className="text-slate-600" />
          <p className="font-medium text-slate-400">Nenhuma pesagem suficiente para curva de tendência.</p>
          <p className="text-[11px] text-slate-500">Registre suas pesagens quando desejar para acompanhar a evolução.</p>
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
          <line x1="10" y1="30" x2="310" y2="30" stroke="#334155" strokeDasharray="3 3" />
          <line x1="10" y1="75" x2="310" y2="75" stroke="#334155" strokeDasharray="3 3" />
          <line x1="10" y1="120" x2="310" y2="120" stroke="#334155" strokeDasharray="3 3" />

          <polyline
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

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

  // Helper for 3-state habits: not_recorded -> completed -> not_completed
  const renderHabitRow = (
    key: keyof HabitState,
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    state: HabitState[keyof HabitState]
  ) => {
    const isCompleted = state === 'completed';
    const isNotCompleted = state === 'not_completed';

    return (
      <div
        onClick={() => onToggleHabit(key)}
        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
          isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : isNotCompleted
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-orange-400">{icon}</div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">{title}</h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-[10px]">
            {isCompleted ? 'Cumprido' : isNotCompleted ? 'Não hoje' : 'Não registrado'}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isCompleted
                ? 'bg-emerald-400 text-slate-950 font-bold'
                : isNotCompleted
                ? 'bg-rose-500/30 text-rose-300'
                : 'border border-slate-700'
            }`}
          >
            {isCompleted && <Check size={14} strokeWidth={3} />}
          </div>
        </div>
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
              <span className="text-3xl font-black text-slate-100">
                {latestWeight !== null ? latestWeight : '--'}
              </span>
              <span className="text-xs text-slate-400 font-semibold">kg</span>
              {hasWeights && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    weightDiff <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {weightDiff > 0 ? `+${weightDiff}` : `${weightDiff}`} kg no período
                </span>
              )}
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
                  placeholder="Ex: 68.5"
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

        {renderWeightChart()}

        <div className="p-3 bg-slate-850/80 rounded-2xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Heart size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <b>Lembrete da Calu:</b> Não é necessário pesar-se diariamente. O peso oscila naturalmente devido à água e rotina. O objetivo é sua saúde e constância!
          </p>
        </div>
      </div>

      {/* Daily Habits Checklist (3-state: not_recorded -> completed -> not_completed) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Acompanhamento de Hábitos
            </h3>
            <p className="text-[11px] text-slate-400">Toque para alternar o status do hábito</p>
          </div>
          <span className="text-xs font-bold text-orange-400">
            {Object.values(habits).filter(v => v === 'completed').length}/5
          </span>
        </div>

        <div className="space-y-2">
          {renderHabitRow(
            'waterGoalMet',
            'Meta de Água',
            `Consumir ${(goals.waterMl / 1000).toFixed(1)}L de água pura`,
            <Droplet size={16} className="text-cyan-400" />,
            habits.waterGoalMet
          )}

          {renderHabitRow(
            'fruitVeggieMet',
            'Frutas & Vegetais',
            'Incluir vegetais ou frutas no prato',
            <Apple size={16} className="text-emerald-400" />,
            habits.fruitVeggieMet
          )}

          {renderHabitRow(
            'threeMealsMet',
            'Refeições Estruturadas',
            'Registrar pelo menos 3 refeições no dia',
            <Utensils size={16} className="text-orange-400" />,
            habits.threeMealsMet
          )}

          {renderHabitRow(
            'exerciseMet',
            'Movimento & Atividade',
            'Caminhada, treino ou esporte',
            <Activity size={16} className="text-rose-400" />,
            habits.exerciseMet
          )}

          {renderHabitRow(
            'goodSleepMet',
            'Sono Reparador',
            '7 a 8 horas de descanso de qualidade',
            <Moon size={16} className="text-indigo-400" />,
            habits.goodSleepMet
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-orange-400" />
          <h4 className="text-xs font-bold text-slate-200">Constância com a Calu</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">
          "Acompanhar sem culpa é o melhor caminho para construir hábitos que duram a vida toda."
        </p>
      </div>
    </div>
  );
};
