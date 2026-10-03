import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, Sparkles, AlertCircle, Edit3 } from 'lucide-react';
import { CaluApiService } from '../services/api';
import { MealAnalysisResponse, MealAnalysisSuccessResponse } from '../types';
import { ImageCompressionService } from '../services/imageCompression';

interface PhotoCaptureModalProps {
  onAnalysisComplete: (data: MealAnalysisSuccessResponse, photoUrl?: string) => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
}

const SAMPLE_BRAZILIAN_MEALS = [
  {
    name: 'Prato Feito (PF) Clássico',
    description: 'Arroz branco, feijão carioca, bife e salada',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Tapioca com Queijo Coalho',
    description: 'Café da manhã tradicional nordestino',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Açaí na Tigela com Banana',
    description: 'Açaí puro, rodelas de banana e granola',
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
  },
];

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  onAnalysisComplete,
  onOpenManualEntry,
  onClose,
}) => {
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userNotes, setUserNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState('Analisando sua refeição...');
  const [errorInfo, setErrorInfo] = useState<{ message: string; showManualFallback: boolean } | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    try {
      setErrorInfo(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch {
      setStreamActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Compress client-side
    const compressed = await ImageCompressionService.compressImage(rawDataUrl);
    setCapturedImage(compressed.dataUrl);
    setMimeType(compressed.mimeType);

    if (videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setStreamActive(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await ImageCompressionService.compressImage(file);
      setCapturedImage(compressed.dataUrl);
      setMimeType(compressed.mimeType);
      setErrorInfo(null);
    } catch (err: any) {
      setErrorInfo({
        message: 'Não foi possível processar a imagem. Tente outra foto.',
        showManualFallback: true,
      });
    }
  };

  const selectSampleMeal = async (sample: (typeof SAMPLE_BRAZILIAN_MEALS)[0]) => {
    try {
      setIsAnalyzing(true);
      setErrorInfo(null);
      const res = await fetch(sample.imageUrl);
      const blob = await res.blob();
      const compressed = await ImageCompressionService.compressImage(blob);
      setCapturedImage(compressed.dataUrl);
      setMimeType(compressed.mimeType);
    } catch {
      setCapturedImage(sample.imageUrl);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setErrorInfo(null);
    setAnalysisStatusText('Identificando alimentos com a Calu...');

    // Progress updates
    const t1 = setTimeout(() => setAnalysisStatusText('Consultando tabela nutricional TACO...'), 2500);
    const t2 = setTimeout(() => setAnalysisStatusText('Calculando porções e macronutrientes...'), 5000);

    try {
      const result = await CaluApiService.analyzePhoto(
        capturedImage,
        mimeType,
        userNotes.trim() || undefined
      );

      clearTimeout(t1);
      clearTimeout(t2);

      if (result.success) {
        onAnalysisComplete(result, capturedImage);
      } else {
        // Section 3: Do NOT invent fake food. Display human error with options
        setErrorInfo({
          message: 'Não consegui analisar essa refeição com segurança.',
          showManualFallback: true,
        });
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorInfo({
        message: 'Não consegui analisar essa refeição com segurança.',
        showManualFallback: true,
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Fotografar Refeição</h2>
              <p className="text-xs text-slate-400">A Calu identifica e busca na base TACO</p>
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
                    setCapturedImage(null);
                    startCamera();
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

          {/* Camera Viewport / Preview */}
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            ) : streamActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border-2 border-dashed border-orange-400/40 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-orange-300/80 bg-black/40 px-2 py-1 rounded-md backdrop-blur-xs">
                    Centralize o prato aqui
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <Camera size={40} className="mx-auto text-slate-600 animate-pulse" />
                <p className="text-xs text-slate-400 max-w-xs">
                  Aponte a câmera para sua refeição ou selecione uma foto da galeria.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Tentar Câmera Novamente
                </button>
              </div>
            )}

            {!capturedImage && streamActive && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-around px-6">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="p-3 bg-black/60 backdrop-blur-md rounded-full text-slate-200 hover:text-white border border-white/20 active:scale-95"
                  title="Alternar Câmera"
                >
                  <RefreshCw size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleCaptureFromCamera}
                  className="w-16 h-16 rounded-full bg-orange-500 p-1 shadow-lg shadow-orange-500/40 active:scale-95 transition-transform flex items-center justify-center"
                  title="Tirar Foto"
                >
                  <div className="w-13 h-13 rounded-full border-2 border-slate-950 bg-white" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-black/60 backdrop-blur-md rounded-full text-slate-200 hover:text-white border border-white/20 active:scale-95"
                  title="Galeria"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            )}

            {capturedImage && (
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  startCamera();
                }}
                className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 shadow"
              >
                <RefreshCw size={13} /> Tirar outra foto
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {!capturedImage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2"
            >
              <ImageIcon size={16} className="text-orange-400" />
              <span>Escolher da Galeria</span>
            </button>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Observações opcionais para a Calu:
            </label>
            <input
              type="text"
              value={userNotes}
              onChange={e => setUserNotes(e.target.value)}
              placeholder="Ex: O frango foi frito na manteiga / Pouco sal"
              className="w-full bg-slate-800/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ou teste com um prato brasileiro:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_BRAZILIAN_MEALS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSampleMeal(sample)}
                  className="flex flex-col items-center p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-center transition-all group"
                >
                  <img
                    src={sample.imageUrl}
                    alt={sample.name}
                    className="w-full h-14 rounded-lg object-cover group-hover:scale-105 transition-transform"
                  />
                  <p className="text-[10px] font-semibold text-slate-200 mt-1 line-clamp-1">{sample.name}</p>
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
            disabled={!capturedImage || isAnalyzing}
            className={`flex-2 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              capturedImage && !isAnalyzing
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-slate-950" />
                <span className="text-slate-950 font-bold">{analysisStatusText}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Analisar com IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
