'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Network, Plus, Trash2, Link as LinkIcon, AlertCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GestorHoldings() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [todosLosClubes, setTodosLosClubes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoHolding, setNuevoHolding] = useState({ nombre: '', slug: '', owner_email: '' });
  const [guardando, setGuardando] = useState(false);

  const [modalVincular, setModalVincular] = useState<{abierto: boolean, holding: any | null}>({ abierto: false, holding: null });
  const [busquedaClub, setBusquedaClub] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: hData, error: hError }, { data: cData, error: cError }] = await Promise.all([
      supabase.from('holdings').select('*, clubes(id, nombre)'),
      supabase.from('clubes').select('id, nombre, holding_id').order('nombre', { ascending: true })
    ]);
      
    if (hError) toast.error('Error cargando holdings: ' + hError.message);
    else setHoldings(hData || []);

    if (cError) toast.error('Error cargando clubes: ' + cError.message);
    else setTodosLosClubes(cData || []);

    setCargando(false);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoHolding)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Holding creado correctamente');
      setModalNuevo(false);
      setNuevoHolding({ nombre: '', slug: '', owner_email: '' });
      cargarDatos();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este holding? Los clubes quedarán desvinculados.')) return;
    const { error } = await supabase.from('holdings').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else {
      toast.success('Eliminado correctamente');
      cargarDatos();
    }
  };

  const handleVincularClub = async (clubId: string) => {
    const holdingId = modalVincular.holding?.id;
    if (!holdingId) return;

    try {
      const res = await fetch('/api/admin/holdings/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holding_id: holdingId, club_id: clubId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Club vinculado exitosamente');
      cargarDatos();
    } catch(e: any) {
      toast.error(e.message);
    }
  };

  const handleDesvincularClub = async (clubId: string) => {
    if (!confirm('¿Desvincular este club del holding?')) return;
    try {
      const res = await fetch('/api/admin/holdings/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holding_id: null, club_id: clubId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Club desvinculado');
      cargarDatos();
    } catch(e: any) {
      toast.error(e.message);
    }
  };

  const clubesDisponibles = todosLosClubes.filter(c => !c.holding_id && c.nombre.toLowerCase().includes(busquedaClub.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Network className="w-6 h-6 text-lime-600" />
            Gestor de Holdings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Crea redes multi-sede y asigna clubes.</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Holding
        </button>
      </div>

      {cargando ? (
        <div className="animate-pulse flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl"></div>)}
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
          <Network className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-bold text-lg">No hay holdings creados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {holdings.map(h => (
            <div key={h.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-lg">{h.nombre}</h3>
                <p className="text-sm text-slate-500 font-mono mb-3">URL: /{h.slug}/holding</p>
                
                {/* Lista de sedes vinculadas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    Sedes Vinculadas ({h.clubes?.length || 0})
                  </h4>
                  {h.clubes?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {h.clubes.map((c: any) => (
                         <div key={c.id} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2">
                           {c.nombre}
                           <button onClick={() => handleDesvincularClub(c.id)} className="text-slate-400 hover:text-red-500">
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No hay clubes vinculados.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalVincular({ abierto: true, holding: h })}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <LinkIcon className="w-4 h-4" /> Vincular Sede
                </button>
                <button
                  onClick={() => handleEliminar(h.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUEVO */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-800 mb-4">Crear Nuevo Holding</h2>
            <form onSubmit={handleCrear} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial</label>
                <input required type="text" value={nuevoHolding.nombre} onChange={e => setNuevoHolding({...nuevoHolding, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" placeholder="Ej: Red Deportiva Gibbor" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Slug (URL)</label>
                <input required type="text" value={nuevoHolding.slug} onChange={e => setNuevoHolding({...nuevoHolding, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" placeholder="ej: red-gibbor" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email del Dueño (Owner)</label>
                <input required type="email" value={nuevoHolding.owner_email} onChange={e => setNuevoHolding({...nuevoHolding, owner_email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" placeholder="correo@dueño.com" />
                <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  El usuario ya debe estar registrado en la plataforma.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalNuevo(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-lime-600 hover:bg-lime-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold transition-colors text-sm">
                  {guardando ? 'Guardando...' : 'Crear Holding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR SEDE */}
      {modalVincular.abierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-800">Vincular Sede a {modalVincular.holding?.nombre}</h2>
              <button onClick={() => setModalVincular({ abierto: false, holding: null })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar club..." 
                value={busquedaClub}
                onChange={e => setBusquedaClub(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {clubesDisponibles.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">No hay clubes disponibles para vincular.</p>
              ) : (
                clubesDisponibles.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700 text-sm">{c.nombre}</span>
                    <button 
                      onClick={() => handleVincularClub(c.id)}
                      className="text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Vincular
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
