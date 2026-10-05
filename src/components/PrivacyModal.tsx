import React, { useState } from 'react';
import { ShieldCheck, Download, Trash2, X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { CaluApiService } from '../services/api';
import { AuthService } from '../services/authService';
import { DateService } from '../services/dateService';

interface PrivacyModalProps {
  onClose: () => void;
  onDataReset: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose, onDataReset }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage('Gerando arquivo de exportação oficial...');
      const data = await CaluApiService.exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calu_ai_meus_dados_${DateService.getLocalDate()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Exportação concluída com sucesso!');
    } catch {
      setMessage('Não foi possível gerar a exportação online.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (
      confirm(
        'Tem certeza que deseja apagar permanentemente todos os seus dados, diário, refeições e conta? Esta ação é definitiva e irreversível em conformidade com a LGPD.'
      )
    ) {
      try {
        setLoading(true);
        setMessage('Excluindo conta, dados e arquivos permanentemente no servidor...');
        await CaluApiService.deleteAccount();
        await AuthService.signOut().catch(() => {});
        onDataReset();
        onClose();
      } catch (err: any) {
        setMessage('Erro ao processar exclusão: ' + (err.message || 'Falha no servidor. Tente novamente.'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Privacidade & LGPD</h2>
              <p className="text-xs text-slate-400">Seus dados nutricionais pertencem a você</p>
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
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {message && (
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-orange-400 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{message}</span>
            </div>
          )}

          {/* Clinical Safety Notice */}
          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <Lock size={14} className="text-orange-400" /> Aviso de Segurança e Saúde
            </h4>
            <p className="text-slate-300 text-[11px]">
              O <b>CALU AI</b> é um assistente de acompanhamento e compreensão dos hábitos alimentares.
              Ele <b>NÃO substitui</b> consultas médicas ou nutricionais e não emite diagnósticos nem prescreve medicamentos ou dietas restritivas para tratamento de condições clínicas.
            </p>
          </div>

          {/* LGPD Directives */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={14} className="text-emerald-400" /> Diretrizes da LGPD (Lei 13.709/2018)
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-400 pl-1">
              <li>• <b>Minimização:</b> Coletamos apenas as informações que você decide registrar para o seu próprio diário.</li>
              <li>• <b>Transparência:</b> Você sabe exatamente quais estimativas foram feitas pela IA e pode alterá-las livremente.</li>
              <li>• <b>Não comercialização:</b> Suas fotos e refeições nunca são vendidas a terceiros.</li>
              <li>• <b>Portabilidade:</b> Você pode baixar uma cópia completa de todos os seus registros em formato aberto (JSON).</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleExport}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download size={15} className="text-orange-400" />
              <span>Exportar Meus Dados Oficiais em JSON</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleDeleteAll}
              className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 size={15} />
              <span>Excluir Minha Conta e Histórico Completo</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
