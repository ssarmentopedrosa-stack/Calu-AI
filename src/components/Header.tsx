import React from 'react';
import { CaluMascot } from './CaluMascot';
import { ChevronLeft, ChevronRight, Calendar, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { DateService } from '../services/dateService';

interface HeaderProps {
  user: UserProfile;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenCoach: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedDate,
  onDateChange,
  onOpenCoach,
  onOpenAuth,
}) => {
  const todayStr = DateService.getLocalDate();
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    onDateChange(DateService.getLocalDate(dateObj));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    onDateChange(DateService.getLocalDate(dateObj));
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
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1"
                title="Gerenciar conta e UID"
              >
                <UserCheck size={10} className="text-emerald-400" />
                <span>UID</span>
              </button>
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
            <span>{DateService.formatLocalDate(selectedDate)}</span>
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
