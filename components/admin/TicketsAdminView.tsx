'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LifeBuoy, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function TicketsAdminView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets_soporte')
      .select(`
        *,
        clubes(nombre),
        perfiles(nombres, correo)
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

  const changeStatus = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('tickets_soporte')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      toast.error('Error al cambiar estado');
    } else {
      toast.success(`Ticket marcado como ${nuevoEstado}`);
      loadTickets();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

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
              <div key={ticket.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 md:items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase">
                      {ticket.categoria}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Hace {Math.floor((Date.now() - new Date(ticket.creado_en).getTime()) / (1000 * 60 * 60 * 24))} días
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 leading-tight mb-2">{ticket.asunto}</h4>
                  <p className="text-slate-600 text-sm mb-4 whitespace-pre-wrap">{ticket.mensaje}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div><span className="font-bold text-slate-700">Club:</span> {ticket.clubes?.nombre}</div>
                    <div><span className="font-bold text-slate-700">Usuario:</span> {ticket.perfiles?.nombres} ({ticket.perfiles?.correo})</div>
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

                  {ticket.estado !== 'Resuelto' && (
                    <div className="flex items-center gap-2 mt-2">
                      {ticket.estado === 'Abierto' && (
                        <button 
                          onClick={() => changeStatus(ticket.id, 'En Progreso')}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                        >
                          Marcar En Progreso
                        </button>
                      )}
                      <button 
                        onClick={() => changeStatus(ticket.id, 'Resuelto')}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Marcar Resuelto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
