'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, Search, RefreshCw, FileSpreadsheet, Eye, 
  ExternalLink, Trash2, Calendar, FileText, CheckCircle, 
  AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface FormResponsesProps {
  formularioId: string;
  onBack?: () => void;
}

export default function FormResponses({ formularioId, onBack }: FormResponsesProps) {
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState<any>(null);
  const [respuestas, setRespuestas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [eliminandoTodo, setEliminandoTodo] = useState(false);
  const [mostrarModalConfirmacionTodo, setMostrarModalConfirmacionTodo] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/formularios/${formularioId}/respuestas`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar respuestas');
      }

      setFormulario(data.formulario);
      setRespuestas(data.respuestas || []);
    } catch (err: any) {
      toast.error(err.message || 'Error al obtener respuestas');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarRespuesta = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta respuesta? Esta acción no se puede deshacer.')) {
      return;
    }

    setEliminandoId(id);
    try {
      const res = await fetch(`/api/formularios/${formularioId}/respuestas?respuestaId=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar respuesta');

      setRespuestas(prev => prev.filter(r => r.id !== id));
      toast.success('Respuesta eliminada con éxito.');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar respuesta');
    } finally {
      setEliminandoId(null);
    }
  };

  const handleEliminarTodasRespuestas = async () => {
    setEliminandoTodo(true);
    try {
      const res = await fetch(`/api/formularios/${formularioId}/respuestas?deleteAll=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar respuestas');

      setRespuestas([]);
      setMostrarModalConfirmacionTodo(false);
      toast.success('Todas las respuestas de prueba han sido eliminadas.');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar respuestas');
    } finally {
      setEliminandoTodo(false);
    }
  };

  useEffect(() => {
    if (formularioId) {
      cargarDatos();
    }
  }, [formularioId]);

  const campos: any[] = useMemo(() => {
    return formulario?.campos || [];
  }, [formulario]);

  // Filtrar respuestas por búsqueda
  const respuestasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return respuestas;
    const q = busqueda.toLowerCase();

    return respuestas.filter(r => {
      const respObj = r.respuestas || {};
      return Object.values(respObj).some(val => {
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (typeof val === 'number') return String(val).includes(q);
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
        return false;
      });
    });
  }, [respuestas, busqueda]);

  // Exportar a Excel (.xlsx) con biblioteca nativa
  const exportarAExcel = () => {
    if (respuestas.length === 0) {
      toast.error('No hay respuestas para exportar.');
      return;
    }

    setExportando(true);
    try {
      // 1. Mapear cada respuesta a una fila con nombres de columna legibles
      const filas = respuestas.map((r, index) => {
        const fila: Record<string, any> = {
          '#': index + 1,
          'Fecha y Hora': new Date(r.created_at).toLocaleString('es-CO')
        };

        campos.forEach(campo => {
          const val = r.respuestas ? r.respuestas[campo.id] : '';
          if (Array.isArray(val)) {
            fila[campo.label] = val.join(', ');
          } else if (typeof val === 'object' && val !== null) {
            fila[campo.label] = JSON.stringify(val);
          } else {
            fila[campo.label] = val || '';
          }
        });

        return fila;
      });

      // 2. Crear libro y hoja
      const worksheet = XLSX.utils.json_to_sheet(filas);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Respuestas');

      // 3. Ajustar ancho de columnas automáticamente
      const maxCols = Object.keys(filas[0] || {}).map(key => ({
        wch: Math.max(key.length + 4, 15)
      }));
      worksheet['!cols'] = maxCols;

      // 4. Descargar archivo
      const cleanTitle = (formulario?.titulo || 'Formulario').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanTitle}_Respuestas_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success('¡Hoja de cálculo exportada con éxito!');
    } catch (err: any) {
      console.error('Error exportando a Excel:', err);
      toast.error('Error al generar el archivo Excel: ' + err.message);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones y KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Respuestas Recibidas
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Total: <span className="text-emerald-600 dark:text-emerald-400">{respuestas.length} personas han respondido</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>

          {respuestas.length > 0 && (
            <button
              onClick={() => setMostrarModalConfirmacionTodo(true)}
              disabled={cargando || eliminandoTodo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              title="Borrar respuestas de prueba"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar Respuestas de Prueba
            </button>
          )}

          <button
            onClick={exportarAExcel}
            disabled={exportando || respuestas.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Buscador de respuestas */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en las respuestas por nombre, número de documento, teléfono..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand shadow-sm"
        />
      </div>

      {/* TABLA DE RESPUESTAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-400">
                <th className="p-4 whitespace-nowrap">#</th>
                <th className="p-4 whitespace-nowrap">Fecha de Envío</th>
                {campos.map(c => (
                  <th key={c.id} className="p-4 whitespace-nowrap min-w-[160px]">
                    {c.label}
                  </th>
                ))}
                <th className="p-4 text-center whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-900/90 shadow-sm">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-200">
              {cargando ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-6" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24" /></td>
                    {campos.slice(0, 4).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32" /></td>
                    ))}
                    <td className="p-4 text-center"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-8 mx-auto" /></td>
                  </tr>
                ))
              ) : respuestasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={campos.length + 3} className="p-16 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">No hay respuestas registradas aún.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Comparte el enlace del formulario para comenzar a recibir información.
                    </p>
                  </td>
                </tr>
              ) : (
                respuestasFiltradas.map((resp, index) => {
                  const datos = resp.respuestas || {};
                  return (
                    <tr key={resp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="p-4 font-black text-slate-400">{index + 1}</td>
                      <td className="p-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(resp.created_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      {campos.map(c => {
                        const val = datos[c.id];

                        // Si es archivo
                        if (c.tipo === 'file') {
                          if (!val) {
                            return <td key={c.id} className="p-4 text-slate-400 italic">Sin archivo</td>;
                          }

                          const isImg = typeof val === 'string' && (val.match(/\.(jpeg|jpg|png|webp|gif)/i) || val.includes('image'));
                          return (
                            <td key={c.id} className="p-4 whitespace-nowrap">
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-all"
                              >
                                {isImg ? <Eye className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                {isImg ? 'Ver Foto' : 'Abrir Documento'}
                              </a>
                            </td>
                          );
                        }

                        // Si es un arreglo (checkbox)
                        if (Array.isArray(val)) {
                          return (
                            <td key={c.id} className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {val.map((item, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={c.id} className="p-4 max-w-[260px] truncate" title={String(val || '')}>
                            {val !== undefined && val !== null && String(val).trim() !== '' ? (
                              String(val)
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Botón de eliminar respuesta individual */}
                      <td className="p-4 text-center whitespace-nowrap sticky right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 transition-colors">
                        <button
                          type="button"
                          onClick={() => handleEliminarRespuesta(resp.id)}
                          disabled={eliminandoId === resp.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Eliminar esta respuesta"
                        >
                          {eliminandoId === resp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación para borrar todas las respuestas */}
      {mostrarModalConfirmacionTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                ¿Borrar todas las respuestas?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Estás a punto de eliminar permanentemente las <strong>{respuestas.length} respuestas</strong> registradas. Esta opción es ideal para limpiar las pruebas que hayas enviado antes de lanzar oficialmente el formulario.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmacionTodo(false)}
                disabled={eliminandoTodo}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarTodasRespuestas}
                disabled={eliminandoTodo}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {eliminandoTodo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Borrando...
                  </>
                ) : (
                  'Sí, Borrar Todo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
