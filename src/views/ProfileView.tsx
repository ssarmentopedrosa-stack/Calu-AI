import React, { useState } from 'react';
import { UserProfile, NutritionGoals } from '../types';
import { 
  User, 
  Target, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  RotateCcw, 
  Save, 
  Check, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { CaluMascot } from '../components/CaluMascot';

interface ProfileViewProps {
  user: UserProfile;
  goals: NutritionGoals;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateGoals: (goals: NutritionGoals) => void;
  onOpenPrivacy: () => void;
  onOpenAuth: () => void;
  onRestartOnboarding: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  goals,
  onUpdateProfile,
  onUpdateGoals,
  onOpenPrivacy,
  onOpenAuth,
  onRestartOnboarding,
}) => {
  const [profileForm, setProfileForm] = useState<UserProfile>(user);
  const [goalsForm, setGoalsForm] = useState<NutritionGoals>(goals);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    onUpdateGoals(goalsForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-5 animate-fadeIn">
      {/* Top Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
        <CaluMascot size="lg" mood="celebrating" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">{profileForm.name}</h2>
            <span className="text-[10px] bg-orange-500/15 text-orange-400 font-bold px-2 py-0.5 rounded-full uppercase">
              {profileForm.plan === 'premium' ? 'CALU PRO' : 'PLANO FREE'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {profileForm.weightKg} kg • {profileForm.heightCm} cm • {profileForm.age} anos
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            UID: {user.uid}
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs animate-fadeIn">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>Alterações salvas com sucesso no banco de dados!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveAll} className="space-y-4">
        {/* Goals Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Target size={15} className="text-orange-400" /> Metas Nutricionais Estimadas
            </h3>
            <span className="text-[10px] text-slate-500">Editável</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            ⚠️ <b>Aviso:</b> As metas são estimativas baseadas em parâmetros médios e não substituem orientação de um nutricionista ou médico.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Calorias (kcal):
              </label>
              <input
                type="number"
                value={goalsForm.calories}
                onChange={e => setGoalsForm({ ...goalsForm, calories: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Água (ml):
              </label>
              <input
                type="number"
                step="100"
                value={goalsForm.waterMl}
                onChange={e => setGoalsForm({ ...goalsForm, waterMl: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Proteína (g):
              </label>
              <input
                type="number"
                value={goalsForm.protein}
                onChange={e => setGoalsForm({ ...goalsForm, protein: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Carboidratos (g):
              </label>
              <input
                type="number"
                value={goalsForm.carbohydrates}
                onChange={e => setGoalsForm({ ...goalsForm, carbohydrates: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Gorduras (g):
              </label>
              <input
                type="number"
                value={goalsForm.fat}
                onChange={e => setGoalsForm({ ...goalsForm, fat: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Fibras (g):
              </label>
              <input
                type="number"
                value={goalsForm.fiber}
                onChange={e => setGoalsForm({ ...goalsForm, fiber: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* User Physical Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <User size={15} className="text-orange-400" /> Perfil Físico & Preferências
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Nome:</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Idade:</label>
              <input
                type="number"
                value={profileForm.age}
                onChange={e => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Altura (cm):
              </label>
              <input
                type="number"
                value={profileForm.heightCm}
                onChange={e => setProfileForm({ ...profileForm, heightCm: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Peso atual (kg):
              </label>
              <input
                type="number"
                step="0.1"
                value={profileForm.weightKg}
                onChange={e => setProfileForm({ ...profileForm, weightKg: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Preferência Alimentar:
              </label>
              <select
                value={profileForm.dietaryPreference}
                onChange={e =>
                  setProfileForm({
                    ...profileForm,
                    dietaryPreference: e.target.value as UserProfile['dietaryPreference'],
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="livre">Alimentação Livre / Variada</option>
                <option value="vegetariano">Vegetariano</option>
                <option value="vegano">Vegano</option>
                <option value="low_carb">Low Carb</option>
                <option value="sem_gluten">Sem Glúten</option>
                <option value="sem_lactose">Sem Lactose</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-98 transition-all"
        >
          <Save size={16} />
          <span>Salvar Alterações de Perfil</span>
        </button>
      </form>

      {/* Plan Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Plano & Limites de IA
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Backend Controlado</span>
        </div>

        <p className="text-xs text-slate-300">
          Você está no plano <b className="text-orange-400 uppercase">{user.plan}</b>. Limites diários: 5 fotos/dia e 20 mensagens de chat/dia.
        </p>

        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Gerenciar Autenticação e Sessão</span>
        </button>
      </div>

      {/* Privacy, LGPD & System Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400" />
            <div className="text-left">
              <span className="font-bold block">Privacidade, Termos e LGPD</span>
              <span className="text-[10px] text-slate-400">Exportar ou excluir seus dados do UID</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </button>

        <button
          type="button"
          onClick={onRestartOnboarding}
          className="w-full p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw size={14} />
          <span>Rever Apresentação Inicial (Onboarding)</span>
        </button>
      </div>
    </div>
  );
};
