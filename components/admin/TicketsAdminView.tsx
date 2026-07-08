'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LifeBuoy, Loader2, CheckCircle, Clock, AlertCircle, Send, MessageSquare, ChevronLeft } from 'lucide-react';

export default function TicketsAdminView({ superAdminId }: { superAdminId?: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets_soporte')
      .select(`
        *,
        clubes(nombre),
        perfiles(nombres, email_contacto)
      `)
      .order('creado_en', { ascending: false });

    if (error) {
      toast.error('Error al cargar tickets');
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

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
    loadMessages(ticket.id);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const changeStatus = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('tickets_soporte')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      toast.error('Error al cambiar estado');
    } else {
      toast.success(`Ticket marcado como ${nuevoEstado}`);
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, estado: nuevoEstado });
      }
      loadTickets();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedTicket) return;

    setSending(true);
    try {
      // Necesitamos el ID del SuperAdmin. Si no está en las props, intentamos sacarlo de Auth
      let sAdminId = superAdminId;
      if (!sAdminId) {
        const { data: { user } } = await supabase.auth.getUser();
        sAdminId = user?.id;
      }

      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: nuevoMensaje,
          remitenteId: sAdminId,
          esStaff: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensajes([...mensajes, data.mensaje]);
        setNuevoMensaje('');
        if (selectedTicket.estado === 'Abierto') {
            setSelectedTicket({ ...selectedTicket, estado: 'En Progreso' });
            loadTickets(); // Refresh list to update status
        }
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  // VISTA DE CHAT
  if (selectedTicket) {
    return (
      <div className="animate-in slide-in-from-right-8 duration-300 h-[80vh] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Header del Chat */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black px-2 py-0.5 bg-brand/10 text-brand rounded uppercase">
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
              <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                {selectedTicket.asunto}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTicket.clubes?.nombre} • {selectedTicket.perfiles?.nombres}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedTicket.estado !== 'Resuelto' && (
                <button 
                  onClick={() => changeStatus(selectedTicket.id, 'Resuelto')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Marcar Resuelto
                </button>
            )}
            {selectedTicket.estado !== 'En Progreso' && selectedTicket.estado !== 'Resuelto' && (
                <button 
                  onClick={() => changeStatus(selectedTicket.id, 'En Progreso')}
                  className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Marcar En Progreso
                </button>
            )}
          </div>
        </div>

        {/* Historial de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-4">
          
          {/* Mensaje original (Ticket) */}
          <div className="flex flex-col items-start max-w-[85%]">
             <div className="p-4 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm text-sm text-slate-700 whitespace-pre-wrap">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">
                  Mensaje Original • {new Date(selectedTicket.creado_en).toLocaleString()}
                </span>
                {selectedTicket.mensaje}
             </div>
          </div>

          {chatLoading ? (
             <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
          ) : (
             mensajes.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex flex-col ${msg.es_staff ? 'items-end' : 'items-start'} max-w-full`}>
                   <div className={`p-4 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap shadow-sm ${
                      msg.es_staff 
                        ? 'bg-slate-800 text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-slate-700 rounded-tl-sm'
                   }`}>
                      {msg.mensaje}
                   </div>
                   <span className="text-[10px] text-gray-400 font-medium mt-1 px-1">
                     {msg.es_staff ? 'Tú (Staff)' : msg.perfiles?.nombres} • {new Date(msg.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
             ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          {selectedTicket.estado === 'Resuelto' ? (
             <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500 font-medium flex flex-col items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                Este ticket está resuelto. Puedes reabrirlo cambiando su estado si necesitas seguir hablando.
             </div>
          ) : (
             <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
               <textarea
                 rows={2}
                 value={nuevoMensaje}
                 onChange={(e) => setNuevoMensaje(e.target.value)}
                 placeholder="Escribe una respuesta para el club..."
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
    );
  }

  // VISTA LISTA DE TICKETS
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Tickets de Soporte</h2>
          <p className="text-sm text-gray-500">Bandeja interna para gestionar las solicitudes de los directores</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <LifeBuoy className="w-12 h-12 text-slate-200 mb-4" />
            <h3 className="text-slate-500 font-bold">No hay tickets de soporte</h3>
            <p className="text-slate-400 text-sm">Todo está funcionando perfectamente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                onClick={() => openTicket(ticket)}
                className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 md:items-center justify-between cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-sm uppercase">
                      {ticket.categoria}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Hace {Math.floor((Date.now() - new Date(ticket.creado_en).getTime()) / (1000 * 60 * 60 * 24))} días
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 leading-tight mb-1 group-hover:text-brand transition-colors">{ticket.asunto}</h4>
                  <p className="text-slate-500 text-sm line-clamp-1 mb-3">{ticket.mensaje}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md"><span className="font-bold text-slate-700">Club:</span> {ticket.clubes?.nombre}</div>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md"><span className="font-bold text-slate-700">Usuario:</span> {ticket.perfiles?.nombres}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    ticket.estado === 'Abierto' ? 'bg-red-50 text-red-600 border border-red-200' :
                    ticket.estado === 'En Progreso' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                    'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {ticket.estado === 'Abierto' && <AlertCircle className="w-3 h-3" />}
                    {ticket.estado === 'En Progreso' && <Clock className="w-3 h-3" />}
                    {ticket.estado === 'Resuelto' && <CheckCircle className="w-3 h-3" />}
                    {ticket.estado}
                  </div>
                  <div className="text-xs font-bold text-brand flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageSquare className="w-3 h-3" /> Abrir Chat
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
