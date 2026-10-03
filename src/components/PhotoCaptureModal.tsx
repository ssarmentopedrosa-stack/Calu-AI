import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, Sparkles, Check, AlertCircle } from 'lucide-react';
import { CaluApiService } from '../services/api';
import { MealAnalysisResponse } from '../types';

interface PhotoCaptureModalProps {
  onAnalysisComplete: (data: MealAnalysisResponse, photoUrl?: string) => void;
  onClose: () => void;
}

// Sample Brazilian food base64/URLs for instant testing if camera is not handy
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
  {
    name: 'Frango com Legumes e Arroz',
    description: 'Peito de frango grelhado e cenoura/brócolis',
    imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=600&q=80',
  },
];

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  onAnalysisComplete,
  onClose,
}) => {
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userNotes, setUserNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream
  const startCamera = async () => {
    try {
      setErrorMsg(null);
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
    } catch (err: any) {
      console.warn('Camera access error or unsupported:', err);
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

  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setMimeType('image/jpeg');

    // Stop camera stream to save battery
    if (videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setStreamActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Convert remote image url to base64 for sample dishes
  const selectSampleMeal = async (sample: (typeof SAMPLE_BRAZILIAN_MEALS)[0]) => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      // Fetch and convert sample
      const res = await fetch(sample.imageUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setCapturedImage(base64data);
        setMimeType('image/jpeg');
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setCapturedImage(sample.imageUrl);
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await CaluApiService.analyzePhoto(
        capturedImage,
        mimeType,
        userNotes.trim() || undefined
      );
      onAnalysisComplete(result, capturedImage);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || 'Não foi possível analisar a refeição no momento. Tente novamente ou use a entrada por texto.'
      );
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
              <p className="text-xs text-slate-400">A Calu identifica os alimentos e porções</p>
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
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Camera or Image Preview Box */}
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
                {/* Visual Target Frame */}
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
                  Aponte a câmera para sua comida ou selecione uma foto da galeria.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Tentar Câmera Novamente
                </button>
              </div>
            )}

            {/* In-camera Controls Overlay */}
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

                {/* Shutter Button */}
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

            {/* Retake button when image is captured */}
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

          {/* Quick upload button if not captured */}
          {!capturedImage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2"
              >
                <ImageIcon size={16} className="text-orange-400" />
                <span>Escolher da Galeria</span>
              </button>
            </div>
          )}

          {/* Optional context note */}
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

          {/* Quick Brazilian Samples for immediate testing */}
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ou teste com um prato brasileiro:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_BRAZILIAN_MEALS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSampleMeal(sample)}
                  className="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-left transition-all group"
                >
                  <img
                    src={sample.imageUrl}
                    alt={sample.name}
                    className="w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition-transform shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{sample.name}</p>
                    <p className="text-[9px] text-slate-400 line-clamp-1">{sample.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Action */}
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
                <span className="text-slate-950 font-bold">Analisando sua refeição com IA...</span>
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
