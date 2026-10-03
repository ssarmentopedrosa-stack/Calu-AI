import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Sparkles, RefreshCw, AlertCircle, Volume2, Edit3, ArrowRight } from 'lucide-react';
import { CaluApiService } from '../services/api';
import { MealAnalysisSuccessResponse } from '../types';

interface VoiceModalProps {
  onAnalysisComplete: (data: MealAnalysisSuccessResponse) => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
}

const SAMPLE_VOICE_PROMPTS = [
  'Hoje no almoço comi arroz branco, feijão carioca, um filé de frango grelhado e salada.',
  'No café da manhã comi 2 ovos mexidos, uma fatia de pão integral e um café com leite.',
  'Comi uma tigela média de açaí com banana picada.',
  'Comi um prato de cuscuz de milho com manteiga e dois ovos cozidos.',
];

export const VoiceModal: React.FC<VoiceModalProps> = ({
  onAnalysisComplete,
  onOpenManualEntry,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; showManualFallback: boolean } | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setErrorInfo({
            message: 'Acesso ao microfone negado ou não suportado.',
            showManualFallback: true,
          });
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    setErrorInfo(null);
    if (!speechSupported) {
      setErrorInfo({
        message: 'Reconhecimento de voz não suportado neste navegador. Digite ou use os exemplos.',
        showManualFallback: true,
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Falha ao iniciar microfone:', err);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setIsAnalyzing(true);
    setErrorInfo(null);

    try {
      const result = await CaluApiService.analyzeText(transcript.trim());

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
              <Mic size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Falar Refeição</h2>
              <p className="text-xs text-slate-400">Fale em português, confira o texto e analise</p>
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
                    toggleRecording();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Tentar falar novamente</span>
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

          {/* Central Mic Button */}
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              {isRecording && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-orange-500/20 animate-ping" />
                  <span className="absolute -inset-2 rounded-full bg-orange-500/30 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={toggleRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
                  isRecording
                    ? 'bg-rose-500 shadow-rose-500/40 scale-105'
                    : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/30 hover:scale-105 active:scale-95'
                }`}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-300">
              {isRecording ? 'Gravando... fale agora' : 'Toque para falar sua refeição'}
            </p>
          </div>

          {/* Transcript Confirmation Box (Section 37: Voice -> Text -> Confirm Text -> Analysis) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[90px] relative space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Texto Reconhecido (você pode editar antes de enviar):
              </label>
              {transcript && (
                <span className="text-[10px] text-orange-400 font-semibold flex items-center gap-1">
                  <Edit3 size={10} /> Editável
                </span>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="O que você falou aparecerá aqui para você conferir..."
              rows={3}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ou escolha uma frase de exemplo:
            </span>
            <div className="space-y-1.5">
              {SAMPLE_VOICE_PROMPTS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTranscript(sample)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 flex items-center gap-2 transition-colors"
                >
                  <Volume2 size={14} className="text-orange-400 shrink-0" />
                  <span className="line-clamp-1 italic">"{sample}"</span>
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
            disabled={!transcript.trim() || isAnalyzing}
            className={`flex-2 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              transcript.trim() && !isAnalyzing
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
                <span>Analisar Texto Falado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
