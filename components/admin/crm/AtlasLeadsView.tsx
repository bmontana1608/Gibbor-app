'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Map, Search, Filter, ArrowUpDown, ExternalLink, MapPin, Phone, Globe, Star, ShieldAlert, Loader2, UserPlus, MessageCircle, Plus, X, Check, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AtlasLeadsView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [embajadorFilter, setEmbajadorFilter] = useState('todos');

  // Modal para agregar lead manual (ej. de un torneo)
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [newLead, setNewLead] = useState({
    nombre: '',
    ciudad: '',
    telefono: '',
    categoria: 'Academia Formativa',
    prioridad: 'Alta',
    estado: 'Prospecto',
    embajador_id: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchData();
  }, [estadoFilter]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch embajadores
    const { data: embData } = await supabase.from('embajadores').select('id, nombre_completo').order('nombre_completo');
    if (embData) setEmbajadores(embData);

    // Fetch leads
    let query = supabase.from('atlas_academias').select('*, embajadores(nombre_completo)').order('created_at', { ascending: false });

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
      toast.success(value ? 'Lead asignado al embajador' : 'Asignación removida');

      // Notificar al embajador si se asignó
      if (value) {
        const leadObj = leads.find(l => l.id === leadId);
        try {
          await supabase.from('notificaciones_embajadores').insert({
            embajador_id: value,
            tipo: 'NUEVO_LEAD',
            mensaje: `Se te ha asignado el lead comercial: "${leadObj?.nombre || 'Academia'}" para prospección.`
          });
        } catch {
          // Silent
        }
      }
    }
  };

  const handleCrearLeadManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLead(true);

    try {
      const valEmb = newLead.embajador_id ? newLead.embajador_id : null;
      const scoreInicial = newLead.prioridad === 'Muy Alta' ? 90 : newLead.prioridad === 'Alta' ? 75 : newLead.prioridad === 'Media' ? 50 : 30;

      const payload = {
        nombre: newLead.nombre,
        ciudad: newLead.ciudad || null,
        telefono: newLead.telefono || null,
        categoria: newLead.categoria,
        prioridad: newLead.prioridad,
        estado: newLead.estado,
        embajador_id: valEmb,
        observaciones: newLead.observaciones || null,
        score: scoreInicial
      };

      const { data, error } = await supabase
        .from('atlas_academias')
        .insert(payload)
        .select('*, embajadores(nombre_completo)')
        .single();

      if (error) throw error;

      toast.success(valEmb ? 'Lead registrado y asignado al embajador' : 'Lead registrado con éxito');

      // Notificar embajador
      if (valEmb) {
        try {
          await supabase.from('notificaciones_embajadores').insert({
            embajador_id: valEmb,
            tipo: 'NUEVO_LEAD',
            mensaje: `Se te ha asignado el nuevo lead "${newLead.nombre}" obtenido en campo.`
          });
        } catch {}
      }

      setLeads(prev => [data, ...prev]);
      setShowAddModal(false);
      setNewLead({
        nombre: '',
        ciudad: '',
        telefono: '',
        categoria: 'Academia Formativa',
        prioridad: 'Alta',
        estado: 'Prospecto',
        embajador_id: '',
        observaciones: ''
      });
    } catch (err: any) {
      toast.error('Error al guardar lead: ' + err.message);
    } finally {
      setSavingLead(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (lead.ciudad && lead.ciudad.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (embajadorFilter === 'todos') return true;
    if (embajadorFilter === 'sin_asignar') return !lead.embajador_id;
    return lead.embajador_id === embajadorFilter;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            Atlas de Leads
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredLeads.length} registros
            </span>
          </h2>
          <p className="text-slate-500 text-sm">Directorio comercial de prospección y asignación a embajadores.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar academia o ciudad..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white shadow-sm"
            />
          </div>

          {/* Filtro por Estado */}
          <select 
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
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

          {/* Filtro por Embajador */}
          <select
            value={embajadorFilter}
            onChange={(e) => setEmbajadorFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
          >
            <option value="todos">Todos los embajadores</option>
            <option value="sin_asignar">Sin embajador asignado</option>
            {embajadores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre_completo}</option>
            ))}
          </select>

          {/* Botón Nuevo Lead Manual */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-sm shrink-0"
          >
            <Plus size={16} />
            Nueva Academia / Lead
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Academia</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6">Score/Prio</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Embajador Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando datos...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No se encontraron academias con los filtros seleccionados.</td></tr>
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
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" /> {lead.telefono}
                            </div>
                            <a 
                              href={`/admin/crm/chat?phone=${lead.telefono}`}
                              className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                              title="Abrir chat en CRM"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-slate-300">Sin teléfono</span>}
                        {lead.website ? (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-black text-slate-900 border border-slate-200">
                          {lead.score || 50}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                          lead.prioridad === 'Muy Alta' ? 'bg-purple-100 text-purple-700' :
                          lead.prioridad === 'Alta' ? 'bg-red-100 text-red-700' :
                          lead.prioridad === 'Media' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {lead.prioridad || 'Media'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                        {lead.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <UserPlus className={`w-4 h-4 ${lead.embajador_id ? 'text-lime-600' : 'text-slate-400'}`} />
                        <select
                          value={lead.embajador_id || ''}
                          onChange={(e) => handleAssign(lead.id, e.target.value)}
                          className="border border-slate-200 rounded-lg text-xs py-1.5 px-2 focus:ring-2 focus:ring-lime-500 outline-none bg-slate-50 hover:bg-white transition-colors cursor-pointer w-44 font-medium text-slate-800"
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
        
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando datos...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No se encontraron academias.</div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{lead.nombre}</h3>
                    <p className="text-xs text-slate-500">{lead.categoria}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-lg">
                    {lead.estado}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {lead.ciudad || 'N/A'}
                  </div>
                  {lead.telefono ? (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-slate-400" /> {lead.telefono}
                    </div>
                  ) : <span className="text-xs text-slate-300">Sin teléfono</span>}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asignado a:</span>
                  <select
                    value={lead.embajador_id || ''}
                    onChange={(e) => handleAssign(lead.id, e.target.value)}
                    className="border border-slate-200 rounded-lg text-xs py-1.5 px-2 bg-slate-50 font-medium w-48"
                  >
                    <option value="">Sin asignar</option>
                    {embajadores.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Registrar Nuevo Lead Manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Nueva Academia / Prospecto</h3>
                <p className="text-xs text-slate-500">Ingresa manualmente prospectos captados en torneos o eventos.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearLeadManual} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nombre de la Academia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Club Deportivo Los Leones"
                  value={newLead.nombre}
                  onChange={e => setNewLead({ ...newLead, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    placeholder="Medellín, Antioquia"
                    value={newLead.ciudad}
                    onChange={e => setNewLead({ ...newLead, ciudad: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="3001234567"
                    value={newLead.telefono}
                    onChange={e => setNewLead({ ...newLead, telefono: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Estado Inicial
                  </label>
                  <select
                    value={newLead.estado}
                    onChange={e => setNewLead({ ...newLead, estado: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="Prospecto">Prospecto</option>
                    <option value="Primer contacto">Primer contacto</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="Demo">Demo</option>
                    <option value="Negociación">Negociación</option>
                    <option value="Cliente">Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newLead.prioridad}
                    onChange={e => setNewLead({ ...newLead, prioridad: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="Muy Alta">Muy Alta</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              {/* ASIGNACIÓN A EMBAJADOR */}
              <div className="bg-lime-50/80 border border-lime-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-xs font-black text-lime-900 uppercase tracking-wider">
                  Asignar a Embajador
                </label>
                <select
                  value={newLead.embajador_id}
                  onChange={e => setNewLead({ ...newLead, embajador_id: e.target.value })}
                  className="w-full border border-lime-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value="">Sin asignar</option>
                  {embajadores.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                  ))}
                </select>
                <p className="text-[11px] text-lime-800 leading-tight">
                  Este lead aparecerá directamente en la pestaña "Mis Leads" del panel del embajador para su seguimiento comercial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notas / Origen del Contacto
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Captado en Torneo Baby Soccer Cali por el embajador..."
                  value={newLead.observaciones}
                  onChange={e => setNewLead({ ...newLead, observaciones: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow disabled:opacity-50"
                >
                  {savingLead ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Guardar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
