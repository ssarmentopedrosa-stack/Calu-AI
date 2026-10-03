import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  Trash2, 
  Plus, 
  X, 
  Bot, 
  ShieldAlert, 
  Flame, 
  Apple, 
  Clock 
} from 'lucide-react';
import { ChatMessage, CaluMemoryItem, Meal, NutritionGoals, UserProfile } from '../types';
import { CaluMascot } from '../components/CaluMascot';
import { CaluApiService } from '../services/api';
import { StorageService } from '../services/storage';

interface CoachViewProps {
  user: UserProfile;
  goals: NutritionGoals;
  meals: Meal[];
}

const QUICK_PROMPTS = [
  'O que posso comer no jantar?',
  'Como está minha proteína hoje?',
  'Opção rápida de lanche brasileiro',
  'O que você sabe sobre meus hábitos?',
];

export const CoachView: React.FC<CoachViewProps> = ({ user, goals, meals }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => StorageService.getChatMessages());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<CaluMemoryItem[]>(() => StorageService.getMemories());
  const [newMemoryText, setNewMemoryText] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Aggregate user today context
  const totalCalories = meals.reduce((acc, m) => acc + m.totalCalories, 0);
  const totalProtein = Number(meals.reduce((acc, m) => acc + m.totalProtein, 0).toFixed(1));
  const remainingCalories = Math.max(0, goals.calories - totalCalories);
  const remainingProtein = Math.max(0, goals.protein - totalProtein);

  const todayMealsSummary = meals.length > 0
    ? meals.map(m => `${m.name} (${m.totalCalories} kcal, ${m.totalProtein}g prot)`).join('; ')
    : 'Nenhuma refeição registrada hoje.';

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    StorageService.saveChatMessages(updatedMessages);
    setInputText('');
    setIsSending(true);

    try {
      const userContext = {
        name: user.name,
        goal: user.goal,
        dietaryPreference: user.dietaryPreference,
        targetCalories: goals.calories,
        consumedCalories: totalCalories,
        targetProtein: goals.protein,
        consumedProtein: totalProtein,
        todayMealsSummary,
        memories: memories.map(m => m.content),
      };

      const reply = await CaluApiService.chatWithCalu(updatedMessages, userContext);

      const caluMsg: ChatMessage = {
        id: 'msg_calu_' + Date.now(),
        sender: 'calu',
        text: reply,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, caluMsg];
      setMessages(finalMessages);
      StorageService.saveChatMessages(finalMessages);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'calu',
        text: 'Não consegui me conectar aos servidores agora. Verifique sua conexão e tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    StorageService.addMemory(newMemoryText.trim(), 'preferencia');
    setMemories(StorageService.getMemories());
    setNewMemoryText('');
  };

  const handleDeleteMemory = (id: string) => {
    StorageService.deleteMemory(id);
    setMemories(StorageService.getMemories());
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-3 flex flex-col h-[calc(100vh-130px)] animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <CaluMascot size="md" mood={isSending ? 'thinking' : 'happy'} />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-100">Calu AI Coach</h2>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Acolhedora • Sem culpa • Contexto do seu dia
            </p>
          </div>
        </div>

        {/* Calu Memory Button */}
        <button
          type="button"
          onClick={() => setShowMemoryModal(true)}
          className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 flex items-center gap-1.5 text-xs transition-colors"
          title="Ver o que a Calu lembra sobre você"
        >
          <BrainCircuit size={15} className="text-orange-400" />
          <span className="font-semibold text-[11px]">Memória</span>
        </button>
      </div>

      {/* Real-time Context Strip for transparency */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl px-3 py-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <Flame size={12} className="text-orange-400" />
          Restam: <b className="text-slate-200">{remainingCalories} kcal</b>
        </span>
        <span>•</span>
        <span>
          Proteína: <b className="text-slate-200">{totalProtein}g</b> / {goals.protein}g
        </span>
        <span>•</span>
        <span>{meals.length} refeições</span>
      </div>

      {/* Chat Messages Box */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'calu' && (
              <div className="shrink-0 mt-0.5">
                <CaluMascot size="sm" mood="happy" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-orange-500/10'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-start gap-2.5">
            <CaluMascot size="sm" mood="thinking" />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce delay-150" />
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce delay-300" />
              <span className="text-[11px] ml-1">Calu pensando no seu contexto...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-orange-500/40 text-[11px] text-slate-300 whitespace-nowrap hover:text-orange-400 transition-colors shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Pergunte à Calu sobre alimentos, lanches..."
          className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending}
          className={`p-2.5 rounded-xl transition-all ${
            inputText.trim() && !isSending
              ? 'bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold active:scale-95'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Send size={15} />
        </button>
      </div>

      {/* Memory Modal Drawer */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Memória da Calu</h3>
                  <p className="text-xs text-slate-400">Suas preferências explícitas e editáveis</p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                A Calu aprende <b>apenas</b> com o que você compartilha expressamente. Você pode visualizar, adicionar novas notas ou excluir qualquer memória a qualquer momento.
              </p>

              {/* Add Memory Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={e => setNewMemoryText(e.target.value)}
                  placeholder="Ex: Não gosto de peixe / Treino às 18h"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Salvar
                </button>
              </div>

              {/* Memory Items List */}
              <div className="space-y-2">
                {memories.map(mem => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{mem.content}</p>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {mem.category} • Criado em {mem.createdAt}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                      title="Excluir preferência"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMemoryModal(false)}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
