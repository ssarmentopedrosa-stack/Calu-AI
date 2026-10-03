import React from 'react';

interface CaluMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: 'happy' | 'thinking' | 'celebrating' | 'curious';
  className?: string;
}

export const CaluMascot: React.FC<CaluMascotProps> = ({
  size = 'md',
  mood = 'happy',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-400 p-0.5 shadow-md shadow-orange-500/20 ${sizeMap[size]} ${className}`}
      title="Calu — Sua assistente inteligente de hábitos alimentares"
    >
      <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 to-amber-500/10 pointer-events-none" />

        {/* Mascot Face Icon / SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 text-amber-400"
        >
          {/* Head */}
          <rect
            x="8"
            y="10"
            width="32"
            height="28"
            rx="12"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2.5"
          />

          {/* Calu Antenna/Spark */}
          <path
            d="M24 10V5M24 5L21 7.5M24 5L27 7.5"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Eyes depending on mood */}
          {mood === 'thinking' ? (
            <>
              <circle cx="18" cy="22" r="3" fill="#f8fafc" />
              <path d="M28 22L34 22" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : mood === 'celebrating' ? (
            <>
              <path d="M15 23C16.5 20.5 19.5 20.5 21 23" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M27 23C28.5 20.5 31.5 20.5 33 23" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="18" cy="22" r="3" fill="#f8fafc" />
              <circle cx="30" cy="22" r="3" fill="#f8fafc" />
              {/* Cute eye spark */}
              <circle cx="19" cy="21" r="1" fill="#fb923c" />
              <circle cx="31" cy="21" r="1" fill="#fb923c" />
            </>
          )}

          {/* Friendly Smile */}
          <path
            d="M19 28C21 31 27 31 29 28"
            stroke="#fdba74"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Cheeks */}
          <circle cx="14" cy="26" r="1.5" fill="#f43f5e" fillOpacity="0.6" />
          <circle cx="34" cy="26" r="1.5" fill="#f43f5e" fillOpacity="0.6" />
        </svg>

        {/* Live status dot */}
        <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
      </div>
    </div>
  );
};
