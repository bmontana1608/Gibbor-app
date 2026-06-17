'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, CheckCircle2, XCircle, Plus, Search, DollarSign, ExternalLink, Calendar, Check, X, ShieldCheck } from 'lucide-react';

export default function EmbajadoresAdminView() {
  const [embajadores, setEmbajadores] = useState<any[]>([]);
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'lista' | 'comisiones'>('lista');

  // Formulario de creación
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    user_id: '',
    nombre_completo: '',
    empresa: '',
    tipo: 'Vendedor Independiente',
    telefono: '',
    email: '',
    password: '',
    ciudad: '',
  });

  // Modal de Pago de Comisiones
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedComision, setSelectedComision] = useState<any>(null);
  const [pagoData, setPagoData] = useState({ comprobante: '', observaciones: '' });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Usar la vista para cargar métricas rápidamente
      const resEmb = await supabase.from('vw_embajadores_metricas').select('*').order('clientes_activos', { ascending: false });
      
      // Obtener detalles extras desde la tabla original
      const resDetalles = await supabase.from('embajadores').select('id, empresa, tipo, email, telefono, estado, created_at');
      
      if (resEmb.data && resDetalles.data) {
        // Unir datos
        const fusionados = resEmb.data.map(m => {
          const det = resDetalles.data.find(d => d.id === m.embajador_id);
          return { ...m, ...det };
        });
        setEmbajadores(fusionados);
      }

      // Cargar comisiones pendientes
      const resCom = await supabase
        .from('comisiones')
        .select('*, clubes(nombre), embajadores(nombre_completo)')
        .eq('estado', 'Pendiente')
        .order('created_at', { ascending: false });
        
      if (resCom.data) setComisiones(resCom.data);
    } catch (e) {
      toast.error('Error al cargar datos');
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGuardarEmbajador = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      
      let url = '/api/admin/embajadores';
      let method = 'POST';

      if (isEditing) {
        method = 'PUT';
      } else {
        payload.estado = 'Activo';
        payload.codigo_referido = formData.nombre_completo.split(' ')[0].toUpperCase() + Math.floor(1000 + Math.random() * 9000);
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar embajador');
      
      toast.success(isEditing ? 'Embajador actualizado' : 'Embajador creado exitosamente');
      setShowModal(false);
      setFormData({ id: '', user_id: '', nombre_completo: '', empresa: '', tipo: 'Vendedor Independiente', telefono: '', email: '', password: '', ciudad: '' });
      setIsEditing(false);
      cargarDatos();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const abrirModalCrear = () => {
    setIsEditing(false);
    setFormData({ id: '', user_id: '', nombre_completo: '', empresa: '', tipo: 'Vendedor Independiente', telefono: '', email: '', password: '', ciudad: '' });
    setShowModal(true);
  };

  const abrirModalEditar = (emb: any) => {
    setIsEditing(true);
    setFormData({
      id: emb.id,
      user_id: emb.user_id || '',
      nombre_completo: emb.nombre_completo,
      empresa: emb.empresa || '',
      tipo: emb.tipo || 'Vendedor Independiente',
      telefono: emb.telefono || '',
      email: emb.email,
      password: '', // En blanco para no cambiar si no se desea, excepto si no tiene user_id
      ciudad: emb.ciudad || '',
    });
    setShowModal(true);
  };

  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
    const { error } = await supabase.from('embajadores').update({ estado: nuevoEstado }).eq('id', id);
    if (error) toast.error('Error al cambiar estado');
    else { toast.success(`Embajador ${nuevoEstado}`); cargarDatos(); }
  };

  const pagarComision = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('comisiones').update({
        estado: 'Pagada',
        fecha_pago: new Date().toISOString(),
        comprobante_pago: pagoData.comprobante,
        observaciones: pagoData.observaciones
      }).eq('id', selectedComision.id);

      if (error) throw error;
      toast.success('Comisión marcada como pagada');
      setShowPagoModal(false);
      setPagoData({ comprobante: '', observaciones: '' });
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al pagar: ' + e.message);
    }
    setLoading(false);
  };

  if (loading && embajadores.length === 0) {
    return <div className="p-8 text-center text-slate-500">Cargando embajadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Embajadores Comerciales</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona a tus promotores y paga comisiones.</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="bg-lime-500 hover:bg-lime-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuevo Embajador
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setTab('lista')}
          className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 ${tab === 'lista' ? 'border-lime-500 text-lime-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Directorio ({embajadores.length})
        </button>
        <button 
          onClick={() => setTab('comisiones')}
          className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 ${tab === 'comisiones' ? 'border-lime-500 text-lime-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Comisiones Pendientes ({comisiones.length})
        </button>
      </div>

      {/* VISTA: DIRECTORIO DE EMBAJADORES */}
      {tab === 'lista' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Embajador</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Clubes Activos</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Comisiones Pagadas</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {embajadores.map(emb => (
                  <tr key={emb.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{emb.nombre_completo}</div>
                      <div className="text-xs text-slate-500 mt-1">{emb.email} • {emb.telefono}</div>
                      {emb.empresa && <div className="text-xs text-lime-600 font-semibold mt-1">{emb.empresa}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">{emb.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xl font-black text-slate-800">{emb.clientes_activos || 0}</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">de {emb.total_referidos || 0} refs</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-900">${(emb.comisiones_pagadas || 0).toLocaleString('es-CO')}</div>
                      {emb.comisiones_pendientes > 0 && (
                        <div className="text-xs text-amber-500 font-bold mt-1">Pendiente: ${(emb.comisiones_pendientes).toLocaleString('es-CO')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${emb.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {emb.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => abrirModalEditar(emb)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => toggleEstado(emb.id, emb.estado)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${emb.estado === 'Activo' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                        >
                          {emb.estado === 'Activo' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {embajadores.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No hay embajadores registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA: COMISIONES */}
      {tab === 'comisiones' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {comisiones.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Todo al día</h3>
              <p className="text-slate-500 text-sm mt-1">No hay comisiones pendientes por pagar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Gen.</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Embajador</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Club Referido</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comisiones.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {c.embajadores?.nombre_completo}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {c.clubes?.nombre}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-lime-600 text-lg">${Number(c.monto).toLocaleString('es-CO')}</div>
                        <div className="text-xs font-medium text-slate-400 mt-1">{Number(c.porcentaje_aplicado || 0)}% aplicado</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { setSelectedComision(c); setShowPagoModal(true); }}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        >
                          <DollarSign size={14} /> Pagar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR EMBAJADOR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{isEditing ? 'Editar Embajador' : 'Nuevo Embajador'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleGuardarEmbajador} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre Completo</label>
                <input required type="text" value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="Juan Pérez"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="juan@correo.com"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono</label>
                  <input type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="+57..."/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    {isEditing && formData.user_id ? 'Cambiar Contraseña (Opcional)' : 'Contraseña de acceso *'}
                  </label>
                  <input required={!isEditing || !formData.user_id} type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder={isEditing && formData.user_id ? 'Dejar en blanco para mantener' : 'Min. 6 caracteres'}/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Empresa / Organización</label>
                  <input type="text" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="Opcional"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Tipo de Perfil</label>
                  <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all">
                    <option value="Proveedor">Proveedor (Uniformes, Balones, etc.)</option>
                    <option value="Organizador">Organizador de Torneos</option>
                    <option value="Entrenador">Entrenador independiente</option>
                    <option value="Escuela Aliada">Director de Escuela Aliada</option>
                    <option value="Vendedor Independiente">Vendedor Independiente</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                  {loading ? 'Guardando...' : isEditing ? 'Actualizar Embajador' : 'Crear Embajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGAR COMISIÓN */}
      {showPagoModal && selectedComision && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Registrar Pago</h3>
              <button onClick={() => setShowPagoModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium">Monto a pagar</p>
              <p className="text-3xl font-black text-lime-600 mt-1">${Number(selectedComision.monto).toLocaleString('es-CO')}</p>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">A: {selectedComision.embajadores?.nombre_completo}</p>
            </div>
            <form onSubmit={pagarComision} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Enlace del Comprobante (Opcional)</label>
                <input type="url" value={pagoData.comprobante} onChange={e => setPagoData({...pagoData, comprobante: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="https://drive.google.com/..."/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Observaciones</label>
                <input type="text" value={pagoData.observaciones} onChange={e => setPagoData({...pagoData, observaciones: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all" placeholder="Transferencia bancaria Bancolombia..."/>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                  {loading ? 'Procesando...' : 'Marcar como Pagada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
