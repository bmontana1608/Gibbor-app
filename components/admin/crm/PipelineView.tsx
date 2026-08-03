'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Phone, MapPin, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = ['Prospecto', 'Primer contacto', 'Seguimiento', 'Demo', 'Negociación', 'Cliente', 'Perdido'];

export default function PipelineView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('atlas_academias')
      .select('id, nombre, estado, prioridad, ciudad, telefono')
      .neq('estado', 'Perdido') // Opcional: Ocultar perdidos en el pipeline principal o mostrarlos en su columna
      .order('score', { ascending: false })
      .limit(100); // Limitar para no saturar el Kanban si hay miles

    if (error) toast.error('Error cargando Pipeline');
    else setLeads(data || []);
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

    // Si pasa a cliente, idealmente se debe enlazar a un embajador o crear cuenta (lógica futura)
    const { error } = await supabase
      .from('atlas_academias')
      .update({ estado: nuevoEstado })
      .eq('id', leadId);

    if (error) {
      toast.error('Error al actualizar estado');
      fetchPipeline(); // Revert
    } else {
      toast.success(`Movido a ${nuevoEstado}`);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-lime-500" /></div>;

  return (
    <div className="p-6 h-[80vh] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Pipeline de Ventas</h2>
          <p className="text-slate-500 text-sm">Arrastra las tarjetas para cambiar su estado (Top 100 por Score).</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto hide-scrollbar pb-4">
        {ESTADOS.map(estado => {
          const columnLeads = leads.filter(l => l.estado === estado);
          return (
            <div 
              key={estado} 
              className="flex-none w-80 bg-slate-100/50 rounded-2xl flex flex-col border border-slate-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, estado)}
            >
              <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-700">{estado}</h3>
                <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                  {columnLeads.length}
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnLeads.map(lead => (
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
                      <button className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 leading-tight mb-3">{lead.nombre}</h4>
                    
                    <div className="space-y-1.5 mt-auto">
                      {lead.ciudad && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {lead.ciudad}
                        </div>
                      )}
                      {lead.telefono && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.telefono}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
