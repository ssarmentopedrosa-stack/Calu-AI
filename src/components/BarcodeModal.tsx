import React, { useState } from 'react';
import { Barcode, X, Search, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { BRAZILIAN_BARCODES } from '../data/barcodeDatabase';
import { BarcodeProduct, FoodItem, Meal, MealType } from '../types';
import { AuthService } from '../services/authService';
import { DateService } from '../services/dateService';

interface BarcodeModalProps {
  onAddMeal: (meal: Meal) => void;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ onAddMeal, onClose }) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [servingsCount, setServingsCount] = useState(1);
  const [mealType, setMealType] = useState<MealType>('snack');

  const handleLookup = (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;

    const product = BRAZILIAN_BARCODES[code];
    if (product) {
      setScannedProduct(product);
      setNotFound(false);
      setBarcodeInput(code);
    } else {
      setScannedProduct(null);
      setNotFound(true);
    }
  };

  const handleConfirm = () => {
    if (!scannedProduct) return;

    const ratio = servingsCount;
    const foodItem: FoodItem = {
      id: 'barcode_item_' + Date.now(),
      name: `${scannedProduct.name} (${scannedProduct.brand})`,
      estimatedQuantity: scannedProduct.servingSize * ratio,
      unit: scannedProduct.unit,
      confidence: 1.0,
      calories: Math.round(scannedProduct.calories * ratio),
      protein: Number((scannedProduct.protein * ratio).toFixed(1)),
      carbohydrates: Number((scannedProduct.carbohydrates * ratio).toFixed(1)),
      fat: Number((scannedProduct.fat * ratio).toFixed(1)),
      fiber: Number((scannedProduct.fiber * ratio).toFixed(1)),
      source: scannedProduct.source || 'Rótulo do Fabricante / Base EAN-13',
    };

    const currentUid = AuthService.getCurrentUser()?.uid || 'usr_local_default';
    const nowIso = new Date().toISOString();

    const meal: Meal = {
      id: 'meal_barcode_' + Date.now(),
      uid: currentUid,
      name: scannedProduct.name,
      mealType,
      time: DateService.getLocalTime(),
      date: DateService.getLocalDate(),
      timestamp: nowIso,
      foods: [foodItem],
      totalCalories: foodItem.calories,
      totalProtein: foodItem.protein,
      totalCarbohydrates: foodItem.carbohydrates,
      totalFat: foodItem.fat,
      totalFiber: foodItem.fiber,
      userConfirmed: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onAddMeal(meal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Barcode size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Leitor de Código de Barras</h2>
              <p className="text-xs text-slate-400">Escaneie ou digite o código EAN do produto</p>
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
          {/* Scanner Simulation Box */}
          <div className="relative w-full h-36 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            {/* Laser scanning line effect */}
            <div className="absolute inset-x-6 h-0.5 bg-rose-500/80 shadow-[0_0_12px_#f43f5e] animate-bounce" />

            <Barcode size={64} className="text-slate-700 mb-2" />
            <span className="text-[11px] text-slate-400 font-medium">
              Alinhe a linha vermelha sobre o código de barras
            </span>
          </div>

          {/* Barcode Manual Entry */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Digitar Código de Barras (EAN-13):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Ex: 7891000100103"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
              <button
                type="button"
                onClick={() => handleLookup()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Product Not Found Alert */}
          {notFound && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-300 text-xs">
              <AlertCircle size={16} className="shrink-0 text-amber-400" />
              <span>Produto não encontrado na base. Você pode cadastrá-lo manualmente pela busca.</span>
            </div>
          )}

          {/* Found Product Card */}
          {scannedProduct && (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-orange-500/40 space-y-3 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    {scannedProduct.brand} • {scannedProduct.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{scannedProduct.name}</h3>
                  <p className="text-xs text-slate-400">
                    Porção de referência: {scannedProduct.unit}
                  </p>
                </div>
                <span className="text-lg font-black text-orange-400">
                  {Math.round(scannedProduct.calories * servingsCount)} kcal
                </span>
              </div>

              {/* Servings Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Quantidade de porções:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setServingsCount(Math.max(0.5, servingsCount - 0.5))}
                    className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-100 w-8 text-center">
                    {servingsCount}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setServingsCount(servingsCount + 0.5)}
                    className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Nutrients Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Prot</span>
                  <p className="font-bold text-emerald-400">
                    {(scannedProduct.protein * servingsCount).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Carb</span>
                  <p className="font-bold text-amber-400">
                    {(scannedProduct.carbohydrates * servingsCount).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Gord</span>
                  <p className="font-bold text-rose-400">
                    {(scannedProduct.fat * servingsCount).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Fibras</span>
                  <p className="font-bold text-teal-400">
                    {(scannedProduct.fiber * servingsCount).toFixed(1)}g
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Brazilian Barcode Presets */}
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Códigos de teste de supermercados do Brasil:
            </span>
            <div className="space-y-1.5">
              {Object.values(BRAZILIAN_BARCODES).slice(0, 4).map(prod => (
                <button
                  key={prod.barcode}
                  type="button"
                  onClick={() => handleLookup(prod.barcode)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{prod.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">EAN: {prod.barcode}</p>
                  </div>
                  <span className="text-orange-400 font-bold text-xs">{prod.calories} kcal</span>
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
            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!scannedProduct}
            className={`flex-2 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              scannedProduct
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Check size={16} strokeWidth={3} />
            <span>Adicionar ao Diário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
