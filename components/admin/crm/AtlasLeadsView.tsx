'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Map, Search, Filter, ArrowUpDown, ExternalLink, MapPin, Phone, Globe, Star, ShieldAlert, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function AtlasLeadsView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, [estadoFilter]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch embajadores
    const { data: embData } = await supabase.from('embajadores').select('id, nombre_completo');
    if (embData) setEmbajadores(embData);

    // Fetch leads
    let query = supabase.from('atlas_academias').select('*, embajadores(nombre_completo)').order('score', { ascending: false });

    if (estadoFilter !== 'Todos') {
      query = query.eq('estado', estadoFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Error cargando Atlas', { description: error.message });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleAssign = async (leadId: string, embajadorId: string) => {
    const value = embajadorId === '' ? null : embajadorId;
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const emb = embajadores.find(e => e.id === value);
        return { ...l, embajador_id: value, embajadores: emb ? { nombre_completo: emb.nombre_completo } : null };
      }
      return l;
    }));

    const { error } = await supabase.from('atlas_academias').update({ embajador_id: value }).eq('id', leadId);
    
    if (error) {
      toast.error('Error al asignar embajador');
      fetchData(); // Revert on error
    } else {
      toast.success(value ? 'Lead asignado exitosamente' : 'Asignación removida');
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (lead.ciudad && lead.ciudad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Atlas de Leads</h2>
          <p className="text-slate-500 text-sm">Directorio maestro de academias de fútbol.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar academia o ciudad..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <select 
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Prospecto">Prospecto</option>
            <option value="Primer contacto">Primer contacto</option>
            <option value="Seguimiento">Seguimiento</option>
            <option value="Demo">Demo</option>
            <option value="Negociación">Negociación</option>
            <option value="Cliente">Cliente</option>
            <option value="Perdido">Perdido</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Academia</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6">Score/Prio</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Asignado a</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando datos...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No se encontraron academias. Importa una base de datos.</td></tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{lead.nombre}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{lead.categoria}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {lead.ciudad || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        {lead.telefono ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" /> {lead.telefono}
                          </div>
                        ) : <span className="text-xs text-slate-300">Sin teléfono</span>}
                        {lead.website ? (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        ) : <span className="text-xs text-slate-300">Sin web</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-xs font-black text-slate-900 border border-slate-200">
                          {lead.score}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                          lead.prioridad === 'Muy Alta' ? 'bg-purple-100 text-purple-700' :
                          lead.prioridad === 'Alta' ? 'bg-red-100 text-red-700' :
                          lead.prioridad === 'Media' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {lead.prioridad}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-lg">
                        {lead.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-slate-400" />
                        <select
                          value={lead.embajador_id || ''}
                          onChange={(e) => handleAssign(lead.id, e.target.value)}
                          className="border border-slate-200 rounded-lg text-xs py-1.5 px-2 focus:ring-1 focus:ring-lime-500 outline-none bg-slate-50 hover:bg-white transition-colors cursor-pointer w-36"
                        >
                          <option value="">Sin asignar</option>
                          {embajadores.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
