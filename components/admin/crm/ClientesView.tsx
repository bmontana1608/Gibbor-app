'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Search, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesView() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      .select('id, nombre, estado_suscripcion, ciudad, plan, created_at, embajador_id')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error cargando clientes', { description: error.message });
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const assignEmbajador = async (clubId: string, embajadorId: string) => {
    const val = embajadorId === 'none' ? null : embajadorId;
    const { error } = await supabase.from('clubes').update({ embajador_id: val }).eq('id', clubId);
    if (error) {
      toast.error('Error asignando embajador', { description: error.message });
    } else {
      toast.success('Embajador actualizado correctamente');
      setClientes(clientes.map(c => c.id === clubId ? { ...c, embajador_id: val } : c));
    }
  };

  const filteredClientes = clientes.filter(cliente => 
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (cliente.ciudad && cliente.ciudad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Cartera de Clientes</h2>
          <p className="text-slate-500 text-sm">Academias que ya están utilizando Master Club Manager.</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Plan</th>
                <th className="py-4 px-6">Estado Suscripción</th>
                <th className="py-4 px-6">Embajador Asignado</th>
                <th className="py-4 px-6 text-right">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando clientes...</td></tr>
              ) : filteredClientes.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No hay clientes que coincidan con la búsqueda.</td></tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {cliente.nombre}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {cliente.ciudad || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg">
                        {cliente.plan || 'Free'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${
                        cliente.estado_suscripcion === 'activa' ? 'bg-green-100 text-green-700' :
                        cliente.estado_suscripcion === 'suspendida' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {cliente.estado_suscripcion || 'Registrado'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={cliente.embajador_id || 'none'}
                        onChange={(e) => assignEmbajador(cliente.id, e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-lime-500 w-[140px]"
                      >
                        <option value="none">Sin embajador</option>
                        {embajadores.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                        ))}
                      </select>
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
            <div className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando clientes...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No hay clientes que coincidan con la búsqueda.</div>
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
                        {cliente.ciudad || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${
                    cliente.estado_suscripcion === 'activa' ? 'bg-green-100 text-green-700' :
                    cliente.estado_suscripcion === 'suspendida' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {cliente.estado_suscripcion || 'Registrado'}
                  </span>
                  <span className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg">
                    {cliente.plan || 'Free'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <select
                      value={cliente.embajador_id || 'none'}
                      onChange={(e) => assignEmbajador(cliente.id, e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-lime-500 w-full"
                    >
                      <option value="none">Sin embajador</option>
                      {embajadores.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-400 text-right shrink-0">
                    Reg. {new Date(cliente.created_at).toLocaleDateString('es-CO')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
