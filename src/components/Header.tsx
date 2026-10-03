import React from 'react';
import { CaluMascot } from './CaluMascot';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenCoach: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedDate,
  onDateChange,
  onOpenCoach,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  // Format date nicely in Brazilian Portuguese
  const formatDateBR = (iso: string) => {
    if (iso === todayStr) return 'Hoje';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User greeting and Calu Mascot */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCoach}
            className="group relative transition-transform active:scale-95"
            title="Abrir Calu AI Coach"
          >
            <CaluMascot size="md" mood="happy" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">CALU AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">BR</span>
            </div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-1">
              Olá, {user.name} <span className="inline-block animate-wiggle">👋</span>
            </h1>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/60 rounded-xl px-1.5 py-1 text-xs">
          <button
            onClick={handlePrevDay}
            className="p-1 text-slate-400 hover:text-slate-100 active:scale-90 transition-transform"
            title="Dia anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="px-2 font-medium text-slate-200 flex items-center gap-1 min-w-[76px] justify-center">
            <Calendar size={12} className="text-orange-400" />
            <span>{formatDateBR(selectedDate)}</span>
          </div>

          <button
            onClick={handleNextDay}
            disabled={isToday}
            className={`p-1 transition-transform ${
              isToday ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-slate-100 active:scale-90'
            }`}
            title="Próximo dia"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
