import React, { useState } from 'react';
import { X, Lock, Mail, User, LogIn, LogOut, Check, AlertCircle } from 'lucide-react';
import { AuthService, AuthSessionUser } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { CaluMascot } from './CaluMascot';

interface AuthModalProps {
  currentUser: AuthSessionUser | null;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ currentUser, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await AuthService.signInWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      if (mode === 'signup') {
        await AuthService.createAccount(email, password, displayName);
      } else {
        await AuthService.signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <CaluMascot size="sm" mood="happy" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Conta & Segurança</h2>
              <p className="text-xs text-slate-400">Identidade protegida e dados vinculados ao seu UID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Auth Status Box */}
          {currentUser && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Sessão Ativa</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                  {isFirebaseConfigured ? 'Firebase Auth' : 'UID Local'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200">
                {currentUser.displayName || currentUser.email || 'Usuário'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono break-all">
                UID: {currentUser.uid}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60"
              >
                <LogOut size={14} />
                <span>Desconectar desta sessão</span>
              </button>
            </div>
          )}

          {/* Switch Mode Pills */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Google One-Click Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl text-xs font-bold text-slate-100 flex items-center justify-center gap-3 transition-colors active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar com o Google</span>
          </button>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] text-slate-500 uppercase">ou com e-mail</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Seu Nome ou Apelido:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Como a Calu deve te chamar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                E-mail:
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Senha:
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              {mode === 'signup' ? 'Cadastrar e Criar Perfil' : 'Entrar na Conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
