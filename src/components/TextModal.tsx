import React, { useState } from 'react';
import { PenLine, X, Sparkles, RefreshCw, AlertCircle, Lightbulb, Edit3 } from 'lucide-react';
import { CaluApiService } from '../services/api';
import { MealAnalysisSuccessResponse } from '../types';

interface TextModalProps {
  onAnalysisComplete: (data: MealAnalysisSuccessResponse) => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
}

const TEXT_SUGGESTIONS = [
  'Comi 2 ovos mexidos, 2 fatias de pão integral e 1 xícara de café com leite',
  'Almocei arroz branco, feijão carioca, peito de frango grelhado e salada verde',
  'Comi 1 tapioca recheada com queijo coalho e tomei café sem açúcar',
  'Lanchei 1 pote de iogurte natural com 1 banana prata',
];

export const TextModal: React.FC<TextModalProps> = ({
  onAnalysisComplete,
  onOpenManualEntry,
  onClose,
}) => {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; showManualFallback: boolean } | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setErrorInfo(null);

    try {
      const result = await CaluApiService.analyzeText(text.trim());

      if (result.success) {
        onAnalysisComplete(result);
      } else {
        // Section 3: Do NOT invent fake food. Display human error with options
        setErrorInfo({
          message: result.message || 'Não consegui analisar essa refeição com segurança.',
          showManualFallback: true,
        });
        setIsAnalyzing(false);
      }
    } catch {
      setErrorInfo({
        message: 'Não consegui analisar essa refeição com segurança.',
        showManualFallback: true,
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <PenLine size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Descrever Refeição</h2>
              <p className="text-xs text-slate-400">A Calu extrai alimentos e cruza com a tabela TACO</p>
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
          {errorInfo && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl space-y-2.5 text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-rose-400" />
                <span className="font-semibold">{errorInfo.message}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorInfo(null);
                    handleAnalyze();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Tentar novamente</span>
                </button>
                {errorInfo.showManualFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManualEntry();
                    }}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <Edit3 size={13} />
                    <span>Registrar manualmente</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              O que você comeu?
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ex: Comi 2 ovos, duas fatias de pão e uma banana..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Lightbulb size={13} className="text-amber-400" />
              <span>Sugestões rápidas para testar:</span>
            </div>
            <div className="space-y-1.5">
              {TEXT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(sug)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 transition-colors line-clamp-1"
                >
                  "{sug}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing}
            className={`flex-2 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              text.trim() && !isAnalyzing
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-slate-950" />
                <span className="text-slate-950 font-bold">Interpretando com a Calu...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Interpretar Refeição</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
