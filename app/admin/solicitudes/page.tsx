'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, FileText, CheckCircle2, XCircle, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudLoading, setSolicitudLoading] = useState(true);
  const [solicitudDetalle, setSolicitudDetalle] = useState<any>(null);
  const [notasAdmin, setNotasAdmin] = useState('');

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setSolicitudLoading(true);
    try {
      const res = await fetch('/api/solicitudes-club');
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch {}
    setSolicitudLoading(false);
  };

  const actualizarSolicitud = async (id: string, estado: string) => {
    try {
      if (estado === 'Aprobado') {
        const res = await fetch('/api/solicitudes-club/aprobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitudId: id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al aprobar y crear el club');
        toast.success('¡Club creado exitosamente!');
      } else {
        const res = await fetch('/api/solicitudes-club', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, estado, notas_admin: notasAdmin }),
        });
        if (!res.ok) throw new Error('Error al actualizar el estado');
        toast.success(`Solicitud marcada como ${estado}`);
      }
      
      setSolicitudDetalle(null);
      cargarSolicitudes();
    } catch (err: any) { 
      toast.error(err.message || 'Error al procesar la solicitud'); 
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-violet-500" /> Solicitudes de Clubes
          </h2>
          <p className="text-sm text-gray-500 mt-1">Academias en lista de espera para unirse al ecosistema</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {solicitudLoading && solicitudes.length === 0 ? (
          <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : solicitudes.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold">¡Todo al día!</p>
            <p className="text-sm mt-1">No hay solicitudes pendientes en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Academia</th>
                  <th className="text-left px-6 py-4">Director</th>
                  <th className="text-left px-6 py-4">Contacto</th>
                  <th className="text-center px-6 py-4">Estado</th>
                  <th className="text-right px-6 py-4">Revisar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{s.nombre_club}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-700">{s.nombre_director}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600">{s.email}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{s.telefono}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        s.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' :
                        s.estado === 'En Revisión' ? 'bg-blue-100 text-blue-700' :
                        s.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSolicitudDetalle(s); setNotasAdmin(s.notas_admin || ''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                      >
                        <Eye size={16} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {solicitudDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{solicitudDetalle.nombre_club}</h3>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    solicitudDetalle.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' :
                    solicitudDetalle.estado === 'En Revisión' ? 'bg-blue-100 text-blue-700' :
                    solicitudDetalle.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {solicitudDetalle.estado}
                  </span>
                  Solicitado el {new Date(solicitudDetalle.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Director/Representante</p>
                  <p className="font-semibold text-gray-900">{solicitudDetalle.nombre_director}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rol</p>
                  <p className="font-semibold text-gray-900">{solicitudDetalle.rol_director}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{solicitudDetalle.email}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teléfono WhatsApp</p>
                  <p className="font-semibold text-gray-900 font-mono">{solicitudDetalle.telefono}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">País</p>
                  <p className="font-semibold text-gray-900">{solicitudDetalle.pais}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ciudad</p>
                  <p className="font-semibold text-gray-900">{solicitudDetalle.ciudad}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tamaño Estimado (Alumnos)</p>
                <p className="font-semibold text-gray-900 text-lg">{solicitudDetalle.estimado_alumnos}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Notas del Administrador (Internas)</label>
                <textarea 
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  className="w-full p-3 border rounded-xl mt-2 text-sm bg-gray-50 h-24 resize-none"
                  placeholder="Escribe notas sobre la validación, llamadas realizadas, etc."
                />
              </div>

              {solicitudDetalle.estado !== 'Aprobado' && solicitudDetalle.estado !== 'Rechazado' && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Aprobar esta solicitud creará automáticamente el club y la cuenta del director en la base de datos de producción con la contraseña por defecto <code className="bg-white px-1 py-0.5 rounded text-emerald-900 font-bold">Master2026*</code>.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
              <button onClick={() => setSolicitudDetalle(null)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors">Cerrar</button>
              
              {solicitudDetalle.estado !== 'Aprobado' && solicitudDetalle.estado !== 'Rechazado' && (
                <div className="flex gap-2">
                  <button onClick={() => actualizarSolicitud(solicitudDetalle.id, 'En Revisión')} className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-colors">Revisando</button>
                  <button onClick={() => actualizarSolicitud(solicitudDetalle.id, 'Rechazado')} className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors">Rechazar</button>
                  <button onClick={() => actualizarSolicitud(solicitudDetalle.id, 'Aprobado')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-200">Aprobar y Crear Club</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
