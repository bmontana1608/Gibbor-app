'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Search, Building2, MapPin, Plus, X, Check, Filter, UserCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesView() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEmbajador, setFiltroEmbajador] = useState('todos');

  // Modal para registrar club manualmente desde el CRM
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClubData, setNewClubData] = useState({
    nombre: '',
    slug: '',
    ciudad: '',
    correo_director: '',
    password_director: '',
    embajador_id: '',
    dias_prueba: '7',
    color_primario: '#84cc16',
    logo_url: ''
  });

  useEffect(() => {
    fetchClientes();
    fetchEmbajadores();
  }, []);

  const fetchEmbajadores = async () => {
    const { data } = await supabase.from('embajadores').select('id, nombre_completo').order('nombre_completo');
    if (data) setEmbajadores(data);
  };

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clubes')
      .select('id, nombre, estado_suscripcion, ciudad, plan, created_at, embajador_id, estado_referido, tarifa_por_jugador')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error cargando clientes', { description: error.message });
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const assignEmbajador = async (clubId: string, embajadorId: string, estadoRefParam?: string) => {
    const val = embajadorId === 'none' ? '' : embajadorId;
    const finalEstadoRef = estadoRefParam || (val ? 'Cliente Activo' : '');

    // Optimistic update
    setClientes(prev => prev.map(c => c.id === clubId ? { 
      ...c, 
      embajador_id: val || null, 
      estado_referido: val ? finalEstadoRef : null 
    } : c));

    try {
      const res = await fetch('/api/admin/clubes/asignar-embajador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: clubId,
          embajador_id: val,
          estado_referido: finalEstadoRef
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al asignar embajador');

      toast.success(val ? 'Embajador asignado y notificado' : 'Asignación removida');
    } catch (err: any) {
      toast.error('Error al actualizar embajador: ' + err.message);
      fetchClientes(); // Revert
    }
  };

  const updateEstadoReferido = async (clubId: string, currentEmbajadorId: string | null, nuevoEstado: string) => {
    if (!currentEmbajadorId) {
      toast.error('Primero debes asignar un embajador a este club');
      return;
    }
    await assignEmbajador(clubId, currentEmbajadorId, nuevoEstado);
  };

  const handleCrearClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload: any = {
        nombre: newClubData.nombre,
        slug: newClubData.slug.toLowerCase().trim().replace(/\s+/g, '-'),
        ciudad: newClubData.ciudad,
        correo_director: newClubData.correo_director,
        password_director: newClubData.password_director,
        dias_prueba: newClubData.dias_prueba,
        color_primario: newClubData.color_primario,
        logo_url: newClubData.logo_url || 'https://masterclubmanager.com/logo-default.png',
        embajador_id: newClubData.embajador_id || null
      };

      const res = await fetch('/api/admin/clubes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar el club');

      toast.success('¡Club registrado y asignado exitosamente!');
      setShowCreateModal(false);
      setNewClubData({
        nombre: '',
        slug: '',
        ciudad: '',
        correo_director: '',
        password_director: '',
        embajador_id: '',
        dias_prueba: '7',
        color_primario: '#84cc16',
        logo_url: ''
      });
      fetchClientes();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (cliente.ciudad && cliente.ciudad.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filtroEmbajador === 'todos') return true;
    if (filtroEmbajador === 'sin_embajador') return !cliente.embajador_id;
    return cliente.embajador_id === filtroEmbajador;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            Cartera de Clientes
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredClientes.length} {filteredClientes.length === 1 ? 'club' : 'clubes'}
            </span>
          </h2>
          <p className="text-slate-500 text-sm">
            Academias activas en Master Club Manager y asignación de embajadores comerciales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente o ciudad..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white shadow-sm"
            />
          </div>

          {/* Filtro por Embajador */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filtroEmbajador}
              onChange={(e) => setFiltroEmbajador(e.target.value)}
              className="text-xs font-medium text-slate-700 outline-none bg-transparent cursor-pointer"
            >
              <option value="todos">Todos los embajadores</option>
              <option value="sin_embajador">Sin embajador asignado</option>
              {embajadores.map(e => (
                <option key={e.id} value={e.id}>{e.nombre_completo}</option>
              ))}
            </select>
          </div>

          {/* Botón Nuevo Club */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-sm"
          >
            <Plus size={16} />
            Nuevo Club / Cliente
          </button>
        </div>
      </div>

      {/* Tabla Desktop */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Plan SaaS</th>
                <th className="py-4 px-6">Embajador Asignado</th>
                <th className="py-4 px-6">Estado Comercial</th>
                <th className="py-4 px-6 text-right">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Cargando cartera de clientes...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No hay clientes que coincidan con la búsqueda o filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="leading-tight">{cliente.nombre}</p>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            cliente.estado_suscripcion === 'Al Día' ? 'text-emerald-600' :
                            cliente.estado_suscripcion === 'En Prueba' ? 'text-blue-600' : 'text-slate-400'
                          }`}>
                            {cliente.estado_suscripcion || 'Activo'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {cliente.ciudad || 'No especificada'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg">
                        {cliente.plan || 'Premium'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <UserCheck className={`w-4 h-4 ${cliente.embajador_id ? 'text-lime-600' : 'text-slate-300'}`} />
                        <select
                          value={cliente.embajador_id || 'none'}
                          onChange={(e) => assignEmbajador(cliente.id, e.target.value, cliente.estado_referido)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-lime-500 font-medium text-slate-800 w-44"
                        >
                          <option value="none">Sin embajador</option>
                          {embajadores.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {cliente.embajador_id ? (
                        <select
                          value={cliente.estado_referido || 'Cliente Activo'}
                          onChange={(e) => updateEstadoReferido(cliente.id, cliente.embajador_id, e.target.value)}
                          className={`text-xs font-black uppercase tracking-wider rounded-lg px-2.5 py-1 outline-none border cursor-pointer ${
                            cliente.estado_referido === 'Cliente Activo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cliente.estado_referido === 'Demo'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="Cliente Activo">Cliente Activo (Comisión)</option>
                          <option value="Demo">En Demo / Prueba</option>
                          <option value="Registrado">Registrado</option>
                          <option value="Suspendido">Suspendido</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-300 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-sm text-slate-500 font-medium">
                      {new Date(cliente.created_at).toLocaleDateString('es-CO')}
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
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Cargando clientes...
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No hay clientes que coincidan con el filtro.</div>
          ) : (
            filteredClientes.map((cliente) => (
              <div key={cliente.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{cliente.nombre}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        {cliente.ciudad || 'No especificada'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                    {cliente.plan || 'Premium'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Embajador Asignado:
                    </label>
                    <select
                      value={cliente.embajador_id || 'none'}
                      onChange={(e) => assignEmbajador(cliente.id, e.target.value, cliente.estado_referido)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-lime-500 w-full"
                    >
                      <option value="none">Sin embajador</option>
                      {embajadores.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                      ))}
                    </select>
                  </div>

                  {cliente.embajador_id && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Estado Comercial en Panel Embajador:
                      </label>
                      <select
                        value={cliente.estado_referido || 'Cliente Activo'}
                        onChange={(e) => updateEstadoReferido(cliente.id, cliente.embajador_id, e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-lime-500 w-full"
                      >
                        <option value="Cliente Activo">Cliente Activo (Comisión)</option>
                        <option value="Demo">En Demo / Prueba</option>
                        <option value="Registrado">Registrado</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 text-right pt-1">
                    Registrado el {new Date(cliente.created_at).toLocaleDateString('es-CO')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Registrar Nuevo Club */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">Registrar Nueva Academia</h3>
                <p className="text-xs text-slate-500">Ingreso manual de club con asignación a embajador.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearClub} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Academia Real Madrid Cali"
                  value={newClubData.nombre}
                  onChange={(e) => {
                    const nom = e.target.value;
                    const autoSlug = nom.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                    setNewClubData({ ...newClubData, nombre: nom, slug: newClubData.slug ? newClubData.slug : autoSlug });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Subdominio (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="real-madrid-cali"
                    value={newClubData.slug}
                    onChange={(e) => setNewClubData({ ...newClubData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Ciudad / Sede
                  </label>
                  <input
                    type="text"
                    placeholder="Cali, Valle"
                    value={newClubData.ciudad}
                    onChange={(e) => setNewClubData({ ...newClubData, ciudad: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* ASIGNACIÓN A EMBAJADOR */}
              <div className="bg-lime-50/70 border border-lime-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-black text-lime-900 uppercase tracking-wider">
                  Asignar a Embajador Comercial
                </label>
                <select
                  value={newClubData.embajador_id}
                  onChange={(e) => setNewClubData({ ...newClubData, embajador_id: e.target.value })}
                  className="w-full border border-lime-300 rounded-xl px-3 py-2.5 text-sm bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value="">Ninguno (Registro directo MCM)</option>
                  {embajadores.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                  ))}
                </select>
                <p className="text-[11px] text-lime-800">
                  El embajador podrá ver este club en su panel inmediatamente como "Cliente Activo" y devengará comisiones recurrentes.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Credenciales de Acceso del Director
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="director@club.com"
                      value={newClubData.correo_director}
                      onChange={(e) => setNewClubData({ ...newClubData, correo_director: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Contraseña Temporal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Pass1234!"
                      value={newClubData.password_director}
                      onChange={(e) => setNewClubData({ ...newClubData, password_director: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-lime-200 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Registrar Academia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
