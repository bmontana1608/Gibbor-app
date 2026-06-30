'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Phone, MapPin, Target, Handshake, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = ['Prospecto', 'Primer contacto', 'Seguimiento', 'Demo', 'Negociación', 'Cliente', 'Perdido'];

export default function MisLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [embajadorId, setEmbajadorId] = useState<string | null>(null);

  useEffect(() => {
    fetchMisLeads();
  }, []);

  const fetchMisLeads = async () => {
    setLoading(true);
    
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Obtener ID del embajador asociado a este usuario
    const { data: embajador } = await supabase
      .from('embajadores')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!embajador) {
      toast.error('No se encontró perfil de embajador');
      setLoading(false);
      return;
    }
    
    setEmbajadorId(embajador.id);

    // Obtener los leads de atlas_academias asignados a este embajador
    const { data, error } = await supabase
      .from('atlas_academias')
      .select('id, nombre, estado, prioridad, ciudad, telefono')
      .eq('embajador_id', embajador.id)
      .order('score', { ascending: false });

    if (error) {
      toast.error('Error cargando leads asignados');
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, nuevoEstado: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.estado === nuevoEstado) return;

    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: nuevoEstado } : l));

    const { error } = await supabase
      .from('atlas_academias')
      .update({ estado: nuevoEstado })
      .eq('id', leadId)
      // Extra seguridad: solo actualiza si le pertenece
      .eq('embajador_id', embajadorId);

    if (error) {
      toast.error('Error al actualizar estado');
      fetchMisLeads(); // Revert on failure
    } else {
      toast.success(`Movido a ${nuevoEstado}`);
      
      // Mostrar recordatorio si se movió a Cliente
      if (nuevoEstado === 'Cliente') {
        toast.info('Lead cerrado. Recuerda enviarle tu enlace de referido para que se registre formalmente.', {
          duration: 6000,
          icon: <Handshake className="w-5 h-5 text-blue-500" />
        });
      }
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-green-500" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <Target className="w-8 h-8 text-green-500" />
          Prospección de Leads
        </h1>
        <p className="text-slate-500 mt-2">
          Gestiona las academias que te han sido asignadas. Arrastra las tarjetas para avanzar en el proceso de venta.
        </p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto hide-scrollbar pb-4">
        {ESTADOS.map(estado => {
          const columnLeads = leads.filter(l => l.estado === estado);
          return (
            <div 
              key={estado} 
              className="flex-none w-80 bg-white/50 rounded-2xl flex flex-col border border-slate-200 shadow-sm"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, estado)}
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                <h3 className="font-bold text-slate-700">{estado}</h3>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-md">
                  {columnLeads.length}
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnLeads.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                    Arrastra una tarjeta aquí
                  </div>
                ) : (
                  columnLeads.map(lead => (
                    <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                          lead.prioridad === 'Muy Alta' ? 'bg-purple-100 text-purple-700' :
                          lead.prioridad === 'Alta' ? 'bg-red-100 text-red-700' :
                          lead.prioridad === 'Media' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {lead.prioridad}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-slate-900 leading-tight mb-3">{lead.nombre}</h4>
                      
                      <div className="space-y-1.5 mt-auto">
                        {lead.ciudad && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {lead.ciudad}
                          </div>
                        )}
                        {lead.telefono && (
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.telefono}
                            </div>
                            <a 
                              href={`/embajador/chat?phone=${lead.telefono}`}
                              className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition-colors shadow-sm"
                              title="Abrir chat en CRM"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
