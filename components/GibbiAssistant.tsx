'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/lib/hooks/useTenant';
import { Bot, X, MessageSquare, Sparkles, Send, Loader2, ChevronRight, Settings, Palette, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  options?: { label: string; action: string }[];
  isTyping?: boolean;
}

export default function GibbiAssistant({ clubId, role = 'Director' }: { clubId?: string | null; role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { slug } = useTenant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [quota, setQuota] = useState<{ used: number, max: number }>({ used: 0, max: 20 });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let roleOptions = [];

      if (role === 'Director' || role === 'SuperAdmin') {
        roleOptions = [
          { label: '🎨 Configurar Colores del Club', action: 'colors' },
          { label: '💳 Añadir Métodos de Pago', action: 'payments' },
          { label: '🏆 Crear Categorías', action: 'categories' },
          { label: '👥 Registrar Jugadores', action: 'players' },
          { label: '📢 Enviar un Comunicado', action: 'announcements' },
        ];
      } else if (role === 'Entrenador') {
        roleOptions = [
          { label: '📋 Tomar Asistencia', action: 'attendance' },
          { label: '🏅 Asignar Puntos de Honor', action: 'points' },
          { label: '⚽ Usar el Planificador', action: 'planner' },
          { label: '📊 Ver Estadísticas', action: 'stats' },
        ];
      } else {
        // Jugador / Familia
        roleOptions = [
          { label: '💳 Pagar Mensualidad', action: 'pay_dues' },
          { label: '🪪 Ver mi Carnet', action: 'id_card' },
          { label: '🔒 Cambiar Contraseña', action: 'security' },
        ];
      }

      roleOptions.push({ label: '🤖 ¿Qué más puedes hacer?', action: 'help' });

      setMessages([
        {
          id: 'welcome',
          type: 'bot',
          text: `¡Hola! Soy Gibbi, tu asistente táctico. 🦁⚽\n\nEstoy aquí para ayudarte a sacar el máximo provecho de Gibbor Multiclub. ¿En qué te puedo ayudar hoy?`,
          options: roleOptions
        }
      ]);
    }
  }, [isOpen, role]);

  const handleOptionClick = (action: string) => {
    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: '' };
    
    switch (action) {
      case 'colors':
        userMsg.text = 'Configurar Colores del Club';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: '¡Genial! Para cambiar los colores y el logo de tu club, debes ir al menú lateral izquierdo y hacer clic en **"Configuración"** (el ícono de engranaje). Allí encontrarás la sección **"Identidad Visual"** donde podrás subir tu logo y elegir los colores Primario y Secundario.\n\nRecuerda guardar y recargar la página para ver los cambios.'
        }]);
        break;
      case 'payments':
        userMsg.text = 'Añadir Métodos de Pago';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Para que tus alumnos puedan pagar, ve a **"Configuración"**. En la sección **"Métodos de Pago"** puedes ingresar tus números de Nequi, Daviplata, Bre-B o Cuenta Bancaria. ¡Esto aparecerá automáticamente cuando un jugador tenga una deuda!'
        }]);
        break;
      case 'categories':
        userMsg.text = 'Crear Categorías';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Las categorías separan a tus jugadores por edades. Ve a **"Categorías"** en el menú izquierdo, haz clic en el botón azul "Nueva Categoría" y define su nombre y año de nacimiento. ¡Luego podrás asignar jugadores a esa categoría!'
        }]);
        break;
      case 'players':
        userMsg.text = 'Registrar Jugadores';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Para agregar un nuevo jugador o entrenador, ve a **"Miembros"** en el menú lateral. Haz clic en el botón **"Nuevo Miembro"**, llena sus datos básicos (nombre, correo) y asígnale el rol de Futbolista. ¡Inmediatamente aparecerá en tu lista y podrás asignarlo a una categoría!'
        }]);
        break;
      case 'announcements':
        userMsg.text = 'Enviar un Comunicado';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Ve al módulo **"Comunicados"**. Allí puedes escribir un mensaje importante para todos los padres de familia y jugadores. Si tienes habilitado el Asistente de WhatsApp, el comunicado les llegará directamente a su celular como por arte de magia. ✨'
        }]);
        break;
      // === Opciones de Entrenador ===
      case 'attendance':
        userMsg.text = 'Tomar Asistencia';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Ve al módulo de **"Pasar Asistencia"**. Selecciona la fecha y la categoría que vas a entrenar. Verás la lista de tus jugadores y podrás marcar si asistieron (✅), faltaron (❌) o llegaron tarde (⏰).'
        }]);
        break;
      case 'points':
        userMsg.text = 'Asignar Puntos de Honor';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Entra a **"Puntos de Honor"**. Busca a tu jugador y asígnale puntos positivos (Goleador, MVP, Disciplina) o negativos (Llegada tarde, Tarjeta Roja). ¡Estos puntos se verán reflejados en su Carnet virtual!'
        }]);
        break;
      case 'planner':
        userMsg.text = 'Usar el Planificador';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'En el **"Planificador"** puedes armar tu sesión de entrenamiento, organizar los ejercicios por fases (Calentamiento, Fase Central, etc.) y dejar todo estructurado antes de salir a la cancha.'
        }]);
        break;
      case 'stats':
        userMsg.text = 'Ver Estadísticas';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'El **"Stats Lab"** y **"Estadísticas"** te permiten evaluar el rendimiento de tus jugadores mediante métricas de FIFA y radares de habilidades. ¡Es genial para ver su progreso mensual!'
        }]);
        break;

      // === Opciones de Jugador ===
      case 'pay_dues':
        userMsg.text = 'Pagar Mensualidad';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Entra al menú de **"Mis Pagos"**. Allí verás tus cobros pendientes. Puedes descargar tu recibo, contactar por WhatsApp para pagar o ver tu historial de pagos confirmados.'
        }]);
        break;
      case 'id_card':
        userMsg.text = 'Ver mi Carnet';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Ve a **"Mi Carnet"**. Ahí encontrarás tu tarjeta de jugador oficial con tu código QR, tu nivel general, los puntos de honor que has ganado y el radar de tus habilidades deportivas.'
        }]);
        break;
      case 'security':
        userMsg.text = 'Cambiar Contraseña';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: 'Ve a **"Seguridad"** en el menú. Allí podrás actualizar tu correo electrónico, cambiar tu contraseña y ver la información básica de tu cuenta.'
        }]);
        break;

      // === Opción de Ayuda ===
      case 'help':
        userMsg.text = '¿Qué más puedes hacer?';
        setMessages(prev => [...prev, userMsg, {
          id: Date.now().toString() + '1',
          type: 'bot',
          text: `Puedo responder preguntas específicas sobre cómo usar la plataforma. Por ejemplo, puedes escribirme:\n\n- "¿Cómo paso asistencia?"\n- "¿Cómo creo un cobro?"\n- "¿Para qué sirven los puntos?"\n\nIntenta escribirme cualquier duda que tengas 👇`
        }]);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Añadir mensaje de "pensando..."
    const botTypingId = Date.now().toString() + 'typing';
    setMessages(prev => [...prev, { id: botTypingId, type: 'bot', text: '...', isTyping: true }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text, clubId, role })
      });

      const data = await res.json();
      
      setMessages(prev => prev.filter(m => m.id !== botTypingId)); // Remover "pensando..."

      if (res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          text: data.reply
        }]);
        setQuota({ used: data.usage.used, max: data.usage.max });
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          text: `Lo siento, hubo un problema: ${data.error}`
        }]);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== botTypingId));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        text: 'Error de conexión. Intenta de nuevo más tarde.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    // Basic Markdown support (bold)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-all relative group"
        title="Pregúntale a Gibbi"
      >
        <Bot className="w-5 h-5 text-brand animate-pulse" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic afuera (visible solo en móviles o como capa invisible en desktop) */}
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] md:bg-transparent md:backdrop-blur-none" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full h-[85vh] md:h-auto md:max-h-[80vh] md:w-[400px] bg-white dark:bg-slate-900 shadow-2xl rounded-t-[2rem] md:rounded-[2rem] border border-slate-200 dark:border-slate-800 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 duration-300">
            
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-brand to-purple-600"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-white rounded-full p-1 shadow-lg overflow-hidden border-2 border-white/20 flex items-center justify-center">
                  <img src="/gibbi.png" alt="Gibbi" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg tracking-tight leading-none">Gibbi IA</h3>
                  <p className="text-brand font-black text-[10px] uppercase tracking-widest mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="bg-white/10 hover:bg-white/20 text-white rounded-full transition-all relative z-10 p-2.5 flex items-center justify-center shadow-sm"
                aria-label="Cerrar asistente"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:max-h-[500px] custom-scrollbar bg-slate-50 dark:bg-slate-950 flex flex-col gap-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                
                <div className={`p-4 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap ${
                  msg.type === 'user' 
                    ? 'bg-brand text-white rounded-tr-sm shadow-md shadow-brand/20 font-medium' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.isTyping ? (
                    <div className="flex gap-1 items-center h-4">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    </div>
                  ) : (
                    formatText(msg.text)
                  )}
                </div>

                {msg.options && (
                  <div className="mt-3 flex flex-col gap-2 w-full max-w-[85%]">
                    {msg.options.map((opt, i) => (
                      <button 
                        key={i}
                        onClick={() => handleOptionClick(opt.action)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand dark:hover:border-brand hover:text-brand text-slate-600 dark:text-slate-400 text-xs font-bold py-2.5 px-4 rounded-xl text-left flex items-center justify-between transition-all shadow-sm"
                      >
                        {opt.label}
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quota Indicator */}
          {quota.used > 0 && (
            <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Consultas IA usadas: {quota.used} / {quota.max}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu consulta..."
                disabled={isLoading}
                className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/50 text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-12 h-12 bg-brand text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-slate-400 transition-all hover:bg-brand/90"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
          </div>
        </>
      )}
    </>
  );
}
