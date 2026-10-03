import React from 'react';
import { Home, BookOpen, BarChart3, Bot, User } from 'lucide-react';

export type NavTab = 'home' | 'diary' | 'progress' | 'coach' | 'profile';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Início', icon: Home },
    { id: 'diary' as NavTab, label: 'Diário', icon: BookOpen },
    { id: 'progress' as NavTab, label: 'Progresso', icon: BarChart3 },
    { id: 'coach' as NavTab, label: 'Calu', icon: Bot, highlight: true },
    { id: 'profile' as NavTab, label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-200 relative group active:scale-95 ${
                isActive ? 'text-orange-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.highlight && (
                <span className="absolute -top-1 right-1/4 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}

              <div
                className={`p-1.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 scale-105'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className="text-[11px] tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
