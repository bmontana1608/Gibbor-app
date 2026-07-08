'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LifeBuoy, Loader2, CheckCircle, Clock, AlertCircle, Send, MessageSquare, ChevronLeft, Plus, HelpCircle, CreditCard } from 'lucide-react';

export default function SoporteDirectorPage() {
  const [profile, setProfile] = useState<any>(null);
  const [clubId, setClubId] = useState<string>('');
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Vista activa: 'lista', 'crear', 'chat'
  const [vista, setVista] = useState<'lista' | 'crear' | 'chat'>('lista');
  
  // Chat state
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Crear Ticket State
  const [asunto, setAsunto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mensajeInicial, setMensajeInicial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categorias = [
    { id: 'Duda Técnica', icon: <HelpCircle className="w-5 h-5 text-blue-500" /> },
    { id: 'Reportar un Error', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
    { id: 'Sugerencia de Mejora', icon: <MessageSquare className="w-5 h-5 text-emerald-500" /> },
    { id: 'Facturación / Pagos', icon: <CreditCard className="w-5 h-5 text-amber-500" /> },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data: per } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
        setProfile(per);
        
        if (per) {
          // Find club id (may be empty for superadmins testing the view)
          const { data: rel } = await supabase.from('clubes_usuarios').select('club_id').eq('usuario_id', per.id).limit(1);
          if (rel && rel.length > 0) {
            setClubId(rel[0].club_id);
          }
          await loadTickets(per.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadTickets = async (dirId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets_soporte')
      .select('*')
      .eq('director_id', dirId)
      .order('creado_en', { ascending: false });

    if (error) {
      toast.error('Error al cargar tickets');
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setMensajes(data.mensajes || []);
      } else {
        toast.error('Error al cargar los mensajes');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setChatLoading(false);
    }
  };

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setVista('chat');
    loadMessages(ticket.id);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleCrearTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !categoria || !mensajeInicial.trim()) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          directorId: profile.id,
          asunto,
          categoria,
          mensaje: mensajeInicial
        })
      });

      if (!res.ok) throw new Error('Error');

      toast.success('¡Ticket enviado con éxito! Nuestro equipo lo revisará pronto.');
      setAsunto('');
      setCategoria('');
      setMensajeInicial('');
      setVista('lista');
      loadTickets(profile.id);
    } catch (err) {
      toast.error('No se pudo crear el ticket. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: nuevoMensaje,
          remitenteId: profile.id,
          esStaff: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensajes([...mensajes, data.mensaje]);
        setNuevoMensaje('');
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* HEADER PAGE */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-brand" />
            Centro de Soporte
          </h1>
          <p className="text-slate-500 font-medium mt-1">Obtén ayuda, reporta errores o chatea con nuestro equipo técnico.</p>
        </div>
        {vista === 'lista' && (
            <button 
                onClick={() => setVista('crear')}
                className="bg-brand hover:bg-brand/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 transition-all"
            >
                <Plus className="w-5 h-5" /> Nuevo Ticket
            </button>
        )}
      </div>

      {/* VISTA: CREAR TICKET */}
      {vista === 'crear' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
           <button onClick={() => setVista('lista')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver a mis tickets
           </button>
           <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="bg-gradient-to-r from-brand to-purple-600 px-6 py-5">
                   <h3 className="text-white font-black text-lg tracking-tight leading-none">Abrir nuevo ticket</h3>
                   <p className="text-white/80 font-medium text-sm mt-1">Explícanos tu situación y te ayudaremos lo antes posible.</p>
               </div>
               <form onSubmit={handleCrearTicket} className="p-6 md:p-8 space-y-6">
                 <div>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Asunto del ticket</label>
                   <input
                     type="text"
                     placeholder="Ej. Problema al cobrar mensualidad"
                     value={asunto}
                     onChange={(e) => setAsunto(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-brand"
                   />
                 </div>

                 <div>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Categoría</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {categorias.map((cat) => (
                       <button
                         key={cat.id}
                         type="button"
                         onClick={() => setCategoria(cat.id)}
                         className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                           categoria === cat.id 
                             ? 'border-brand bg-brand/5 ring-1 ring-brand shadow-sm' 
                             : 'border-slate-200 hover:border-slate-300 bg-white'
                         }`}
                       >
                         {cat.icon}
                         <span className={`text-sm font-bold ${categoria === cat.id ? 'text-brand' : 'text-slate-600'}`}>
                           {cat.id}
                         </span>
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descripción Detallada</label>
                   <textarea
                     rows={5}
                     placeholder="Explícanos tu problema o duda con la mayor cantidad de detalles posible..."
                     value={mensajeInicial}
                     onChange={(e) => setMensajeInicial(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand resize-none"
                   />
                 </div>

                 <div className="pt-4 flex justify-end">
                   <button
                     type="submit"
                     disabled={isSubmitting || !asunto.trim() || !categoria || !mensajeInicial.trim()}
                     className="px-6 py-3 bg-brand hover:bg-brand/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                   >
                     {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><Send className="w-5 h-5" /> Enviar Ticket</>}
                   </button>
                 </div>
               </form>
           </div>
        </div>
      )}

      {/* VISTA: CHAT */}
      {vista === 'chat' && selectedTicket && (
        <div className="animate-in slide-in-from-right-8 duration-300 h-[70vh] flex flex-col bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Header del Chat */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-slate-50 shrink-0">
            <button 
              onClick={() => { setVista('lista'); loadTickets(profile.id); }}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 bg-brand/10 text-brand rounded uppercase">
                  {selectedTicket.categoria}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedTicket.estado === 'Abierto' ? 'bg-red-100 text-red-600' :
                    selectedTicket.estado === 'En Progreso' ? 'bg-amber-100 text-amber-600' :
                    'bg-emerald-100 text-emerald-600'
                }`}>
                  {selectedTicket.estado}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 md:text-lg leading-tight">
                {selectedTicket.asunto}
              </h3>
            </div>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-4">
            {/* Mensaje original (Ticket) */}
            <div className="flex flex-col items-end max-w-full">
               <div className="p-4 bg-brand text-white rounded-2xl rounded-tr-sm shadow-sm text-sm whitespace-pre-wrap max-w-[85%]">
                  <span className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 border-b border-white/20 pb-2">
                    Tu Mensaje Original • {new Date(selectedTicket.creado_en).toLocaleString()}
                  </span>
                  {selectedTicket.mensaje}
               </div>
            </div>

            {chatLoading ? (
               <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
            ) : (
               mensajes.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex flex-col ${!msg.es_staff ? 'items-end' : 'items-start'} max-w-full`}>
                     <div className={`p-4 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap shadow-sm ${
                        !msg.es_staff 
                          ? 'bg-brand text-white rounded-tr-sm' 
                          : 'bg-white border border-gray-200 text-slate-700 rounded-tl-sm'
                     }`}>
                        {msg.mensaje}
                     </div>
                     <span className="text-[10px] text-gray-400 font-medium mt-1 px-1">
                       {!msg.es_staff ? 'Tú' : 'Soporte Técnico'} • {new Date(msg.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                  </div>
               ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            {selectedTicket.estado === 'Resuelto' ? (
               <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center text-sm text-emerald-600 font-bold flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Este ticket ha sido resuelto por soporte.
               </div>
            ) : (
               <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                 <textarea
                   rows={2}
                   value={nuevoMensaje}
                   onChange={(e) => setNuevoMensaje(e.target.value)}
                   placeholder="Escribe una respuesta para soporte técnico..."
                   disabled={sending}
                   className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none resize-none"
                 />
                 <button
                   type="submit"
                   disabled={sending || !nuevoMensaje.trim()}
                   className="h-[46px] px-6 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition-colors"
                 >
                   {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                 </button>
               </form>
            )}
          </div>
        </div>
      )}

      {/* VISTA: LISTA DE TICKETS */}
      {vista === 'lista' && (
        <div className="animate-in fade-in duration-300 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <LifeBuoy className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl text-slate-800 font-black mb-2">No tienes tickets abiertos</h3>
              <p className="text-slate-500 font-medium mb-6">Si tienes alguna duda o problema, estamos aquí para ayudarte.</p>
              <button 
                  onClick={() => setVista('crear')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                  <Plus className="w-5 h-5" /> Crear mi primer ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  onClick={() => openTicket(ticket)}
                  className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 md:items-center justify-between cursor-pointer group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wide">
                        {ticket.categoria}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ticket.estado === 'Abierto' ? 'bg-red-100 text-red-600' :
                          ticket.estado === 'En Progreso' ? 'bg-amber-100 text-amber-600' :
                          'bg-emerald-100 text-emerald-600'
                      }`}>
                        {ticket.estado}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 leading-tight mb-2 group-hover:text-brand transition-colors">{ticket.asunto}</h4>
                    <p className="text-slate-500 text-sm line-clamp-1">{ticket.mensaje}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Hace {Math.floor((Date.now() - new Date(ticket.creado_en).getTime()) / (1000 * 60 * 60 * 24))} días
                    </span>
                    <div className="text-sm font-bold text-brand flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      Ver Chat <ChevronLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
