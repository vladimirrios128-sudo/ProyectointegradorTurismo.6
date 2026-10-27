import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Compass,
  RotateCcw,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'model',
    content:
      '¡Hola, viajero/a! Soy Andino, tu Guía Turístico Inteligente oficial de Colombia. ¿Planeas subir a las cumbres nevadas del Parque El Cocuy, admirar el Santuario de Las Lajas, recorrer los zócalos de Guatapé o navegar el Caribe en Cartagena? Pregúntame sobre rutas, clima, pisos térmicos o consejos de viaje.',
    timestamp: 'Ahora',
  },
];

const SUGGESTED_QUESTIONS = [
  '¿Qué empacar para el Parque El Cocuy?',
  '¿Mejor temporada para Caño Cristales?',
  '¿Cómo ir de Bogotá a Guatapé?',
  '¿Qué consejos hay para el mal de páramo?',
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al conectar con el servidor.');
      }

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: data.reply || 'Disculpa, no pude procesar la respuesta en este momento.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content:
          '¡Hola! Tuve una interrupción momentánea de conexión. Como recomendación general: para destinos andinos como El Cocuy o Los Nevados, empaca ropa térmica por capas (sistema 3 capas) y calzado con buen agarre.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <>
      {/* Botón Flotante Disparador */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#E67E22] via-[#D35400] to-[#E67E22] text-white shadow-2xl shadow-[#E67E22]/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer group"
          aria-label="Abrir Guía Turístico Inteligente Gemini"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div className="text-left pr-1">
            <div className="text-xs font-black tracking-tight flex items-center gap-1 font-display">
              <span>Guía Colombia</span>
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
            <div className="text-[10px] text-neutral-200">Asistente Gemini Contextual</div>
          </div>
        </button>
      )}

      {/* Ventana de Chat Flotante Moderna (Glassmorphism Cultural) */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[400px] h-[580px] max-h-[85vh] bg-[#141b24]/95 backdrop-blur-2xl border border-white/15 rounded-[24px] shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
          role="dialog"
          aria-label="Chat Guía Turístico Colombia"
        >
          {/* Header del Chat */}
          <div className="bg-[#0c1017]/90 px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E67E22] to-[#D4AF37] flex items-center justify-center text-white shadow-md shadow-[#E67E22]/30">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white font-display">Andino · Guía Experto</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#059669]/20 text-[#10B981] border border-[#059669]/30">
                    GenAI
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">Turismo Inteligente de Colombia</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Reiniciar conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimizar chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white rounded-tr-xs'
                      : 'bg-[#0c1017] border border-white/10 text-neutral-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-neutral-400 bg-[#0c1017] border border-white/10 rounded-2xl rounded-tl-xs px-3.5 py-2 max-w-[70%]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E67E22]" />
                <span className="text-[11px] italic">Andino está respondiendo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-[#0c1017]/50 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input y Botón de Envío */}
          <div className="p-3 bg-[#0c1017]/90 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregunta sobre destinos, pisos térmicos, rutas..."
                className="flex-1 bg-[#141b24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#E67E22] transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer shrink-0 shadow-md shadow-[#E67E22]/20"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
