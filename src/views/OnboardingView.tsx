import React, { useState } from 'react';
import { CaluMascot } from '../components/CaluMascot';
import { Camera, Sparkles, Sliders, ArrowRight, Check } from 'lucide-react';
import { UserProfile, NutritionGoals } from '../types';

interface OnboardingViewProps {
  onComplete: (profile: Partial<UserProfile>, goals?: Partial<NutritionGoals>) => void;
}

const ONBOARDING_SLIDES = [
  {
    step: 1,
    title: 'Conheça a Calu',
    subtitle: 'Uma IA para ajudar você a entender sua alimentação.',
    description: 'Sem dietas malucas e sem julgamentos. A Calu é sua assistente inteligente para transformar como você se relaciona com a comida.',
    icon: '🤖',
    mood: 'happy' as const,
  },
  {
    step: 2,
    title: 'Registre sem complicação',
    subtitle: 'Foto, voz ou texto.',
    description: 'Basta apontar a câmera para o prato ou dizer o que comeu. Nossa IA multimodal identifica os alimentos brasileiros e estima as porções num piscar de olhos.',
    icon: '📸',
    mood: 'curious' as const,
  },
  {
    step: 3,
    title: 'Veja seus hábitos',
    subtitle: 'Entenda sua alimentação ao longo do tempo.',
    description: 'Acompanhe água, proteínas, calorias e hábitos com métricas humanizadas. Sem notas punitivas: o que vale é a consistência da sua rotina.',
    icon: '📊',
    mood: 'celebrating' as const,
  },
  {
    step: 4,
    title: 'Você continua no controle',
    subtitle: 'A IA faz estimativas. Você confirma e corrige.',
    description: 'Nenhuma refeição entra no seu diário sem sua aprovação. Ajuste porções, troque unidades e mantenha a precisão que você desejar.',
    icon: '✨',
    mood: 'happy' as const,
  },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Quick user setup state
  const [userName, setUserName] = useState('Camila');
  const [userGoal, setUserGoal] = useState<UserProfile['goal']>('melhorar_habitos');
  const [userActivity, setUserActivity] = useState<UserProfile['activityLevel']>('moderado');

  const handleNextSlide = () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      setShowProfileSetup(true);
    }
  };

  const handleFinish = () => {
    onComplete({
      name: userName.trim() || 'Usuário',
      goal: userGoal,
      activityLevel: userActivity,
      onboardingCompleted: true,
    });
  };

  const slide = ONBOARDING_SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 max-w-md mx-auto animate-fadeIn">
      {!showProfileSetup ? (
        <>
          {/* Top Skip button */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">CALU AI</span>
            <button
              type="button"
              onClick={() => setShowProfileSetup(true)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Pular
            </button>
          </div>

          {/* Slide Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 px-2 my-auto">
            <CaluMascot size="xl" mood={slide.mood} />

            <div className="space-y-3">
              <span className="text-3xl block animate-bounce">{slide.icon}</span>
              <h1 className="text-2xl font-extrabold text-slate-100">{slide.title}</h1>
              <h2 className="text-sm font-semibold text-orange-400">{slide.subtitle}</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                {slide.description}
              </p>
            </div>
          </div>

          {/* Slide Dots & Action */}
          <div className="space-y-4 pb-4">
            <div className="flex justify-center gap-2">
              {ONBOARDING_SLIDES.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? 'w-8 bg-orange-500' : 'w-2 bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNextSlide}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-98 transition-all"
            >
              <span>{currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Começar' : 'Continuar'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        /* Quick Profile Onboarding Setup */
        <div className="flex-1 flex flex-col justify-between py-4 animate-fadeIn">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <CaluMascot size="md" mood="happy" />
              <div>
                <h2 className="text-base font-bold text-slate-100">Como posso te chamar?</h2>
                <p className="text-xs text-slate-400">Vamos personalizar suas metas iniciais</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Seu Nome:</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Digite seu nome ou apelido"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Qual é o seu foco principal?
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'melhorar_habitos', label: 'Melhorar hábitos e ter mais energia', desc: 'Comer com mais consciência' },
                    { id: 'acompanhar', label: 'Acompanhar alimentação no dia a dia', desc: 'Entender macros e calorias' },
                    { id: 'perder_gordura', label: 'Emagrecimento com saúde', desc: 'Deficit calórico moderado' },
                    { id: 'ganhar_massa', label: 'Ganho de massa muscular', desc: 'Foco em boa ingestão proteica' },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setUserGoal(opt.id as any)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        userGoal === opt.id
                          ? 'bg-orange-500/15 border-orange-500 text-orange-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-100">{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-98 transition-all"
          >
            <Check size={18} strokeWidth={3} />
            <span>Entrar no CALU AI</span>
          </button>
        </div>
      )}
    </div>
  );
};
