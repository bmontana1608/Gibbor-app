'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Phone, MapPin, MoreHorizontal, UserCheck, UserPlus, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = ['Prospecto', 'Primer contacto', 'Seguimiento', 'Demo', 'Negociación', 'Cliente', 'Perdido'];

export default function PipelineView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmbajador, setFiltroEmbajador] = useState('todos');

  useEffect(() => {
    fetchEmbajadores();
    fetchPipeline();
  }, []);

  const fetchEmbajadores = async () => {
    const { data } = await supabase.from('embajadores').select('id, nombre_completo').order('nombre_completo');
    if (data) setEmbajadores(data);
  };

  const fetchPipeline = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('atlas_academias')
      .select('id, nombre, estado, prioridad, ciudad, telefono, score, embajador_id, embajadores(id, nombre_completo)')
      .neq('estado', 'Perdido') // Ocultar perdidos en el pipeline principal
      .order('score', { ascending: false })
      .limit(150);

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

  const filteredLeads = leads.filter(lead => {
    if (filtroEmbajador === 'todos') return true;
    if (filtroEmbajador === 'sin_asignar') return !lead.embajador_id;
    return lead.embajador_id === filtroEmbajador;
  });

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-lime-500" /></div>;

  return (
    <div className="p-6 h-[80vh] flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Pipeline de Ventas</h2>
          <p className="text-slate-500 text-sm">Embudo comercial interactivo con trazabilidad de embajadores.</p>
        </div>

        {/* Filtro por Embajador */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Embajador:</span>
          <select
            value={filtroEmbajador}
            onChange={(e) => setFiltroEmbajador(e.target.value)}
            className="text-xs font-semibold text-slate-800 outline-none bg-transparent cursor-pointer"
          >
            <option value="todos">Todos los embajadores</option>
            <option value="sin_asignar">Sin embajador asignado</option>
            {embajadores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre_completo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto hide-scrollbar pb-4">
        {ESTADOS.filter(e => e !== 'Perdido').map(estado => {
          const columnLeads = filteredLeads.filter(l => l.estado === estado);
          return (
            <div 
              key={estado} 
              className="flex-none w-80 bg-slate-100/70 rounded-2xl flex flex-col border border-slate-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, estado)}
            >
              <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-100/40 rounded-t-2xl">
                <h3 className="font-bold text-slate-800 text-sm">{estado}</h3>
                <span className="bg-white text-slate-600 text-xs font-black px-2 py-0.5 rounded-md shadow-xs border border-slate-200">
                  {columnLeads.length}
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnLeads.map(lead => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-md transition-all group"
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
                      <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        Score {lead.score || 50}
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 leading-tight mb-2 text-sm">{lead.nombre}</h4>
                    
                    <div className="space-y-1 mb-3 text-xs text-slate-500">
                      {lead.ciudad && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {lead.ciudad}
                        </div>
                      )}
                      {lead.telefono && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {lead.telefono}
                        </div>
                      )}
                    </div>

                    {/* Embajador Asignado Badge */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {lead.embajadores?.nombre_completo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-800 bg-lime-50 px-2 py-0.5 rounded-lg border border-lime-200 truncate max-w-full">
                          <UserCheck size={12} className="text-lime-600 shrink-0" />
                          <span className="truncate">{lead.embajadores.nombre_completo}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
                          <UserPlus size={12} className="text-slate-300" />
                          Sin embajador
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Sin academias
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
