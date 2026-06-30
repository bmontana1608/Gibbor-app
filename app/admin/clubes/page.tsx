'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, ShieldCheck, Activity, Users, CreditCard, ArrowRightLeft, Trash2, History, AlertTriangle, CheckCircle2, Lock, Mail, Building2, Settings, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const MetricCard = ({ label, value, icon, sub, color }: { label: string, value: string | number, icon: any, sub: string, color: string }) => (
  <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-${color}-100 flex items-start gap-4 hover:-translate-y-1 transition-transform`}>
    <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-2xl flex-shrink-0`}>{icon}</div>
    <div>
      <p className="text-gray-400 font-bold text-sm">{label}</p>
      <h3 className="text-2xl font-black text-gray-800">{value}</h3>
      <p className={`text-[10px] font-bold text-${color}-500 mt-1 uppercase tracking-wider`}>{sub}</p>
    </div>
  </div>
);

const InputField = ({ label, value, onChange, type = "text", placeholder = "", required = false, mono = false }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50 ${mono ? 'font-mono' : ''}`}
      placeholder={placeholder}
      required={required}
    />
  </div>
);

// Extraído de page.tsx
const ClubRow = ({ club, count, onToggle, onAudit, onEdit, onDelete }: any) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            {club.logo_url ? <img src={club.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="text-gray-400" size={20} />}
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{club.nombre}</p>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: club.color_primario || '#ccc' }}></span>
              {club.slug}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-50 text-lime-700 rounded-lg text-sm font-bold">
          <Users size={16} /> {count}
        </div>
      </td>
      <td className="px-6 py-4 hidden md:table-cell">
        {club.planes_saas ? (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700">{club.planes_saas.nombre}</span>
            <span className="text-xs text-gray-400">${club.planes_saas.precio_base?.toLocaleString('es-CO')}/{club.planes_saas.tipo_cobro}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Plan Heredado (Legacy)</span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${club.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : club.estado === 'Suspendido' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {club.estado === 'Activo' ? <CheckCircle2 size={12} /> : club.estado === 'Suspendido' ? <AlertTriangle size={12} /> : <Lock size={12} />}
          {club.estado}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2 transition-opacity">
          <button onClick={() => onEdit(club)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Club"><Settings size={18} /></button>
          <button onClick={() => onAudit(club)} className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors" title="Ver Auditoría"><History size={18} /></button>
          <button onClick={() => onToggle(club.id, club.estado)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title={club.estado === 'Activo' ? 'Suspender' : 'Activar'}>
            <ArrowRightLeft size={18} />
          </button>
          <button onClick={() => onDelete(club.id, club.nombre)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
  );
};

export default function ClubesPage() {
  const [clubes, setClubes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  // States for modals
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [clubAudit, setClubAudit] = useState<any>(null);

  const [formData, setFormData] = useState({
    nombre: '', slug: '', logo_url: '', color_primario: '#84cc16', correo_director: '', password_director: ''
  });
  const [editFormData, setEditFormData] = useState({
    nombre: '', correo_administrativo: '', telefono_contacto: '', direccion: '', nombre_legal: '', sync_director_email: false, director_password: '', director_id: '', fecha_fin_prueba: '', tarifa_por_jugador: 2000, plan_id: '' as string | number
  });
  const [planesSaaS, setPlanesSaaS] = useState<any[]>([]);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setFetching(true);
    const [resClubes, resMetrics, resPlanes] = await Promise.all([
      supabase.from('clubes').select('*, planes_saas(id, nombre, tipo_cobro, precio_base, limite_jugadores_base), created_at').neq('estado', 'Eliminado').order('created_at', { ascending: false }),
      fetch('/api/admin/metrics').then(r => r.json()),
      supabase.from('planes_saas').select('*').order('id', { ascending: true })
    ]);
    setClubes(resClubes.data || []);
    setMetrics(resMetrics);
    setPlanesSaaS(resPlanes.data || []);
    setFetching(false);
  };

  const handleCrearClub = async (e: React.FormEvent) => {
    e.preventDefault(); setFetching(true);
    try {
      const response = await fetch('/api/admin/clubes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setClubes([data, ...clubes]);
      setShowModal(false);
      setFormData({ nombre: '', slug: '', logo_url: '', color_primario: '#84cc16', correo_director: '', password_director: '' });
      toast.success('¡Academia registrada con éxito!');
    } catch (err: any) { toast.error('Error: ' + err.message); }
    finally { setFetching(false); }
  };

  const handleEditClub = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedClub?.id) return; setFetching(true);
    try {
      const response = await fetch(`/api/admin/clubes/${selectedClub.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFormData) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al actualizar');
      toast.success('Club actualizado'); setShowEditModal(false); cargarTodo();
    } catch (err: any) { toast.error(err.message); }
    finally { setFetching(false); }
  };

  const toggleEstadoClub = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
    const { error } = await supabase.from('clubes').update({ estado: nuevoEstado }).eq('id', id);
    if (error) toast.error('Error al cambiar estado');
    else { toast.success(`Club ${nuevoEstado}`); cargarTodo(); }
  };

  const eliminarClub = async (id: string, nombre: string) => {
    if (!window.confirm(`¿ESTÁS SEGURO? Esto eliminará "${nombre.toUpperCase()}" permanentemente.`)) return;
    try {
      const res = await fetch(`/api/admin/clubes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Club eliminado'); cargarTodo();
    } catch (e: any) { toast.error('Error al eliminar: ' + e.message); }
  };

  const auditClub = async (club: any) => {
    setSelectedClub(club);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/clubes/${club.id}`);
      const data = await res.json();
      setClubAudit(data);
    } catch (e) {
      toast.error('Error al cargar auditoría');
    }
    setDetailsLoading(false);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Recaudo SaaS" value={`$${metrics?.recaudoSaaS?.toLocaleString('es-CO') || '0'}`} icon={<CreditCard className="text-emerald-500" size={20} />} sub="Ingresos de Plataforma" color="emerald" />
        <MetricCard label="Volumen Transaccional" value={`$${metrics?.volumenTransaccional?.toLocaleString('es-CO') || '0'}`} icon={<Activity className="text-blue-500" size={20} />} sub="Flujo total de clubes" color="blue" />
        <MetricCard label="Jugadores" value={metrics?.totalJugadores || 0} icon={<Users className="text-lime-500" size={20} />} sub="Totales registrados" color="lime" />
        <MetricCard label="Clubes" value={`${metrics?.clubesActivos || 0}/${metrics?.totalClubes || 0}`} icon={<ShieldCheck className="text-violet-500" size={20} />} sub="Activos / Total" color="violet" />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Gestión de Clubes</h2>
          <p className="text-sm text-gray-500">Academias conectadas al ecosistema MCM</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-lime-200 text-sm">
          <Plus size={18} /> Nueva Academia
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
        {fetching && clubes.length === 0 ? (
          <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Club</th>
                  <th className="text-center px-6 py-4">Atletas</th>
                  <th className="px-6 py-4 hidden md:table-cell">Canon SaaS</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="text-right px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clubes.map(club => (
                  <ClubRow
                    key={club.id} club={club}
                    count={metrics?.alumnosPorClub?.[club.id] || 0}
                    onToggle={toggleEstadoClub} onAudit={auditClub}
                    onEdit={(c: any) => {
                      setSelectedClub(c);
                      setEditFormData({
                        nombre: c.nombre, correo_administrativo: c.correo_administrativo || '', telefono_contacto: c.telefono_contacto || '',
                        direccion: c.direccion || '', nombre_legal: c.nombre_legal || '', sync_director_email: false, director_password: '', director_id: '',
                        fecha_fin_prueba: c.fecha_fin_prueba ? new Date(c.fecha_fin_prueba).toISOString().split('T')[0] : '', tarifa_por_jugador: c.tarifa_por_jugador || 2000,
                        plan_id: c.plan_id || ''
                      });
                      setShowEditModal(true);
                    }}
                    onDelete={eliminarClub}
                  />
                ))}
                {clubes.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">No hay academias registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Nueva Academia</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleCrearClub} className="space-y-4">
              <InputField label="Nombre Comercial" value={formData.nombre} onChange={(v: string) => setFormData({ ...formData, nombre: v })} required />
              <InputField label="Subdominio (Slug)" value={formData.slug} onChange={(v: string) => setFormData({ ...formData, slug: v.toLowerCase().replace(/\s/g, '-') })} placeholder="eagles-fc" required mono />
              <InputField label="URL Logo" value={formData.logo_url} onChange={(v: string) => setFormData({ ...formData, logo_url: v })} placeholder="https://..." required />
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Color de Marca</label>
                <input value={formData.color_primario} onChange={e => setFormData({ ...formData, color_primario: e.target.value })} type="color" className="w-full border border-gray-200 rounded-xl h-12 p-1.5 cursor-pointer" />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-lime-600 uppercase tracking-widest mb-3">Credenciales del Director</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Correo" value={formData.correo_director} onChange={(v: string) => setFormData({ ...formData, correo_director: v })} placeholder="admin@club.com" required type="email" />
                  <InputField label="Contraseña Temporal" value={formData.password_director} onChange={(v: string) => setFormData({ ...formData, password_director: v })} placeholder="Pass1234!" required />
                </div>
              </div>
              <button type="submit" disabled={fetching} className="w-full bg-lime-500 hover:bg-lime-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-200">
                {fetching ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Confirmar Registro</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Editar Club</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditClub} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nombre Comercial" value={editFormData.nombre} onChange={(v: string) => setEditFormData({ ...editFormData, nombre: v })} />
                <InputField label="Nombre Legal" value={editFormData.nombre_legal} onChange={(v: string) => setEditFormData({ ...editFormData, nombre_legal: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Correo Administrativo" value={editFormData.correo_administrativo} onChange={(v: string) => setEditFormData({ ...editFormData, correo_administrativo: v })} type="email" />
                <InputField label="Teléfono" value={editFormData.telefono_contacto} onChange={(v: string) => setEditFormData({ ...editFormData, telefono_contacto: v })} />
              </div>
              <InputField label="Dirección" value={editFormData.direccion} onChange={(v: string) => setEditFormData({ ...editFormData, direccion: v })} />

              <div className="border-t border-gray-100 pt-4 pb-2">
                <h4 className="text-xs font-bold text-lime-600 uppercase tracking-widest mb-3">Facturación SaaS</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Fin Periodo Prueba</label>
                    <input 
                      type="date" 
                      value={editFormData.fecha_fin_prueba} 
                      onChange={e => setEditFormData({...editFormData, fecha_fin_prueba: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-gray-50"
                    />
                  </div>
                </div>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-3 mt-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Facturación SaaS</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Plan de Suscripción</label>
                        <select 
                          value={editFormData.plan_id} 
                          onChange={e => setEditFormData({...editFormData, plan_id: e.target.value})}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-white"
                        >
                          <option value="">Sin plan (Personalizado)</option>
                          {planesSaaS.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.tipo_cobro})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tarifa Custom (Solo si no hay plan)</label>
                        <input 
                          type="number" 
                          value={editFormData.tarifa_por_jugador} 
                          onChange={e => setEditFormData({...editFormData, tarifa_por_jugador: Number(e.target.value)})}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-white"
                          disabled={!!editFormData.plan_id}
                        />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-amber-700">Sincronizar email del Director</p>
                  <p className="text-xs text-amber-600">¿Actualizar email de login del Director?</p>
                </div>
                <button type="button" onClick={() => setEditFormData({ ...editFormData, sync_director_email: !editFormData.sync_director_email })} className={`w-11 h-6 rounded-full transition-colors relative ${editFormData.sync_director_email ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${editFormData.sync_director_email ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {editFormData.sync_director_email && (
                <InputField label="Nueva Contraseña del Director (opcional)" value={editFormData.director_password} onChange={(v: string) => setEditFormData({ ...editFormData, director_password: v })} placeholder="Dejar vacío para no cambiar" />
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" disabled={fetching} className="flex-[2] py-3 text-sm font-bold text-white bg-lime-500 rounded-xl shadow-lg shadow-lime-200">
                  {fetching ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AUDITORÍA */}
      {clubAudit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><History className="text-violet-500" /> Auditoría del Club</h3>
              <button onClick={() => setClubAudit(null)} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {clubAudit.logs && clubAudit.logs.length > 0 ? (
                <div className="space-y-3">
                  {clubAudit.logs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                      <p className="font-bold text-slate-800">{log.accion}</p>
                      <p className="text-xs text-gray-500">{new Date(log.fecha).toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">{log.detalles}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 p-6">No hay logs de auditoría registrados.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
