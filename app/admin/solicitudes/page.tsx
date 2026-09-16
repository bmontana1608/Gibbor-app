'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, FileText, CheckCircle2, XCircle, Eye, AlertTriangle,
  MessageCircle, Send, Copy, ExternalLink, Link2, Building2,
  User, Mail, Phone, MapPin, Users, Sparkles, Shield, Check,
  Clock, ArrowRight, RefreshCw, Key, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { formatInternationalWhatsAppPhone, getWhatsAppUrl, getCountryFlag } from '@/lib/phone-utils';

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudLoading, setSolicitudLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal de Detalle
  const [solicitudDetalle, setSolicitudDetalle] = useState<any>(null);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [slugEditado, setSlugEditado] = useState('');
  const [slugOriginal, setSlugOriginal] = useState('');
  const [guardandoSlug, setGuardandoSlug] = useState(false);
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);

  // Modal de Envío de Credenciales
  const [modalCredenciales, setModalCredenciales] = useState<any>(null);
  const [mensajeCredenciales, setMensajeCredenciales] = useState('');
  const [enviandoBot, setEnviandoBot] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setSolicitudLoading(true);
    try {
      const res = await fetch('/api/solicitudes-club');
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar solicitudes');
    }
    setSolicitudLoading(false);
  };

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://portalgibbor.vercel.app';
  };

  const generarSlugSugerido = (nombre: string) => {
    return (nombre || 'club')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const abrirDetalle = (s: any) => {
    const nombre = s.nombre_academia || s.nombre_club || '';
    const currentSlug = s.slug || s.club_slug || generarSlugSugerido(nombre);
    setSolicitudDetalle(s);
    setNotasAdmin(s.notas_admin || '');
    setSlugEditado(currentSlug);
    setSlugOriginal(s.slug || s.club_slug || '');
  };

  const guardarNuevoSlug = async () => {
    if (!solicitudDetalle) return;
    const clean = slugEditado.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!clean) {
      toast.error('El slug no puede estar vacío');
      return;
    }

    setGuardandoSlug(true);
    const toastId = toast.loading('Guardando nuevo slug...');
    try {
      const res = await fetch('/api/solicitudes-club', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: solicitudDetalle.id,
          slug: clean,
          club_id: solicitudDetalle.club_id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar slug');

      toast.success('¡Slug actualizado exitosamente!', { id: toastId });
      setSlugOriginal(clean);
      setSlugEditado(clean);
      setSolicitudDetalle((prev: any) => ({ ...prev, slug: clean, club_slug: clean }));
      cargarSolicitudes();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar slug', { id: toastId });
    } finally {
      setGuardandoSlug(false);
    }
  };

  const guardarNotasAdmin = async () => {
    if (!solicitudDetalle) return;
    setGuardandoNotas(true);
    try {
      const res = await fetch('/api/solicitudes-club', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: solicitudDetalle.id, notas_admin: notasAdmin }),
      });
      if (!res.ok) throw new Error('Error al guardar notas');
      toast.success('Notas guardadas correctamente');
      setSolicitudDetalle((prev: any) => ({ ...prev, notas_admin: notasAdmin }));
      cargarSolicitudes();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar notas');
    } finally {
      setGuardandoNotas(false);
    }
  };

  const actualizarSolicitud = async (id: string, estado: string) => {
    try {
      if (estado === 'Aprobado') {
        setProcesandoAprobacion(true);
        const cleanSlug = slugEditado.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)+/g, '');
        const res = await fetch('/api/solicitudes-club/aprobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solicitudId: id,
            customSlug: cleanSlug || undefined,
            defaultPassword: 'Master2026*'
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al aprobar y crear el club');
        toast.success('¡Club creado y activado exitosamente!');
        
        if (solicitudDetalle) {
          const updated = {
            ...solicitudDetalle,
            estado: 'Aprobado',
            slug: data.slug || cleanSlug,
            club_slug: data.slug || cleanSlug,
            club_id: data.club?.id
          };
          setSolicitudDetalle(null);
          prepararEnvioCredenciales(updated, data.defaultPassword || 'Master2026*');
        }
      } else {
        const res = await fetch('/api/solicitudes-club', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, estado, notas_admin: notasAdmin }),
        });
        if (!res.ok) throw new Error('Error al actualizar el estado');
        toast.success(`Solicitud marcada como ${estado}`);
        setSolicitudDetalle(null);
      }

      cargarSolicitudes();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la solicitud');
    } finally {
      setProcesandoAprobacion(false);
    }
  };

  const abrirChatWhatsAppDirecto = (s: any) => {
    const nombre = s.nombre_director || 'Director';
    const academia = s.nombre_academia || s.nombre_club || 'tu academia';
    const mensaje = `Hola ${nombre}, te saludamos de Master Club Manager 👋⚽. Nos comunicamos en referencia a tu solicitud de registro para *${academia}*. ¿Tienes unos minutos para conversar?`;
    const url = getWhatsAppUrl(s.telefono, mensaje, s.pais);
    if (url === '#') {
      toast.error('Número de teléfono no disponible');
      return;
    }
    window.open(url, '_blank');
  };

  const prepararEnvioCredenciales = (s: any, pass = 'Master2026*') => {
    const nombre = s.nombre_director || 'Director';
    const academia = s.nombre_academia || s.nombre_club || 'tu academia';
    const slug = s.slug || s.club_slug || generarSlugSugerido(academia);
    const origin = getBaseOrigin();
    const portalUrl = `${origin}/${slug}/login`;

    const mensaje = `¡Hola ${nombre}! 👋⚽

Te damos la bienvenida oficial a *Master Club Manager*. Tu solicitud para *${academia}* ha sido aprobada exitosamente y tu plataforma ya se encuentra completamente configurada y activa. 🚀🎉

Aquí tienes tus credenciales de acceso directo como Director:

🔗 *Enlace de tu Academia:*
${portalUrl}

👤 *Usuario (Email):* ${s.email}
🔑 *Contraseña inicial:* ${pass}

💡 *Recomendación:* Al ingresar por primera vez, puedes cambiar tu contraseña y personalizar tu escudo y colores desde el menú de Configuración.

¿Tienes alguna duda o necesitas ayuda para registrar a tus entrenadores y futbolistas? ¡Estamos a tu disposición para ayudarte a despegar! 🏆`;

    setModalCredenciales(s);
    setMensajeCredenciales(mensaje);
    setCopiado(false);
  };

  const abrirWhatsAppConCredenciales = () => {
    if (!modalCredenciales) return;
    const url = getWhatsAppUrl(modalCredenciales.telefono, mensajeCredenciales, modalCredenciales.pais);
    if (url === '#') {
      toast.error('Número de teléfono no disponible');
      return;
    }
    window.open(url, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  const enviarCredencialesPorBot = async () => {
    if (!modalCredenciales) return;
    setEnviandoBot(true);
    const toastId = toast.loading('Enviando credenciales por WhatsApp Bot...');
    try {
      const cleanPhone = formatInternationalWhatsAppPhone(modalCredenciales.telefono, modalCredenciales.pais);
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: cleanPhone,
          mensaje: mensajeCredenciales,
          instanceName: 'gibbor'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar mensaje');

      toast.success('¡Credenciales enviadas automáticamente por WhatsApp!', { id: toastId });
      setModalCredenciales(null);
    } catch (err: any) {
      toast.error('No se pudo enviar por bot: ' + (err.message || 'Verifica la conexión del bot'), { id: toastId, duration: 6000 });
    } finally {
      setEnviandoBot(false);
    }
  };

  const copiarMensajeCredenciales = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(mensajeCredenciales);
      setCopiado(true);
      toast.success('¡Mensaje copiado al portapapeles!');
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  // Filtrado de solicitudes
  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter(s => {
      const cumpleEstado = filtroEstado === 'todos' ? true : s.estado?.toLowerCase() === filtroEstado.toLowerCase();
      const term = busqueda.toLowerCase().trim();
      const cumpleBusqueda = !term ||
        (s.nombre_academia && s.nombre_academia.toLowerCase().includes(term)) ||
        (s.nombre_club && s.nombre_club.toLowerCase().includes(term)) ||
        (s.nombre_director && s.nombre_director.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.telefono && String(s.telefono).includes(term)) ||
        (s.ciudad && s.ciudad.toLowerCase().includes(term)) ||
        (s.pais && s.pais.toLowerCase().includes(term));

      return cumpleEstado && cumpleBusqueda;
    });
  }, [solicitudes, filtroEstado, busqueda]);

  const conteos = useMemo(() => {
    return {
      todos: solicitudes.length,
      pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
      revision: solicitudes.filter(s => s.estado === 'En Revisión').length,
      aprobadas: solicitudes.filter(s => s.estado === 'Aprobado').length,
      rechazadas: solicitudes.filter(s => s.estado === 'Rechazado').length,
    };
  }, [solicitudes]);


  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-violet-600" /> Solicitudes de Academias
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Revisión, asignación de slugs personalizados y activación de credenciales por WhatsApp
          </p>
        </div>

        <button
          onClick={cargarSolicitudes}
          disabled={solicitudLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-slate-700 font-bold rounded-xl text-sm shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={solicitudLoading ? 'animate-spin text-violet-600' : ''} />
          Actualizar
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'todos', label: 'Todas', count: conteos.todos, color: 'bg-slate-100 text-slate-700' },
            { id: 'Pendiente', label: 'Pendientes', count: conteos.pendientes, color: 'bg-orange-100 text-orange-700' },
            { id: 'En Revisión', label: 'En Revisión', count: conteos.revision, color: 'bg-blue-100 text-blue-700' },
            { id: 'Aprobado', label: 'Aprobadas', count: conteos.aprobadas, color: 'bg-emerald-100 text-emerald-700' },
            { id: 'Rechazado', label: 'Rechazadas', count: conteos.rechazadas, color: 'bg-red-100 text-red-700' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filtroEstado === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${filtroEstado === tab.id ? 'bg-white/20 text-white' : tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Buscar por club, director, país, tel..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {solicitudLoading && solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500 font-medium">Cargando solicitudes...</p>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">¡No hay solicitudes que coincidan!</p>
            <p className="text-sm mt-1 text-gray-500">Intenta cambiando el filtro de estado o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Academia / Club</th>
                  <th className="text-left px-6 py-4">Director</th>
                  <th className="text-left px-6 py-4">Contacto & País</th>
                  <th className="text-center px-4 py-4">Alumnos</th>
                  <th className="text-left px-4 py-4">Slug Asignado</th>
                  <th className="text-center px-4 py-4">Estado</th>
                  <th className="text-right px-6 py-4">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudesFiltradas.map((s) => {
                  const nombreClub = s.nombre_academia || s.nombre_club || 'Sin Nombre';
                  const slugFinal = s.slug || s.club_slug || '';
                  const flag = getCountryFlag(s.pais);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Logo y Nombre */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s.logo_url ? (
                            <img
                              src={s.logo_url}
                              alt={nombreClub}
                              className="w-11 h-11 rounded-xl object-contain bg-slate-100 border border-gray-200 p-1 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 font-black text-sm flex items-center justify-center flex-shrink-0 border border-violet-200">
                              {nombreClub.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                              {nombreClub}
                              {s.codigo_referido && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-black">
                                  REF
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock size={12} /> {new Date(s.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Director */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-800">{s.nombre_director || '—'}</p>
                        <p className="text-xs text-gray-500">{s.rol_director || 'Director'}</p>
                      </td>

                      {/* Contacto y País */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-700 font-medium truncate max-w-[180px]" title={s.email}>
                          {s.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm" title={s.pais || 'País'}>{flag}</span>
                          <span className="text-xs text-gray-600 font-mono">{s.telefono || '—'}</span>
                        </div>
                      </td>

                      {/* Alumnos */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {s.jugadores_estimados || s.estimado_alumnos || '—'}
                        </span>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-4">
                        {slugFinal ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200/60">
                            <Link2 size={12} className="text-violet-500" />
                            <span>/{slugFinal}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-mono">
                            ~/{generarSlugSugerido(nombreClub)}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          s.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' :
                          s.estado === 'En Revisión' ? 'bg-blue-100 text-blue-700' :
                          s.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {s.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón WhatsApp Directo */}
                          <button
                            onClick={() => abrirChatWhatsAppDirecto(s)}
                            title="Contactar por WhatsApp"
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors border border-emerald-200/50"
                          >
                            <MessageCircle size={16} />
                          </button>

                          {/* Botón Enviar Credenciales (si está aprobado) */}
                          {s.estado === 'Aprobado' && (
                            <button
                              onClick={() => prepararEnvioCredenciales(s)}
                              title="Enviar Credenciales por WhatsApp"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200"
                            >
                              <Key size={13} />
                              <span className="hidden sm:inline">Credenciales</span>
                            </button>
                          )}

                          {/* Botón Ver Detalle */}
                          <button
                            onClick={() => abrirDetalle(s)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                          >
                            <Eye size={15} /> Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: DETALLE COMPLETO DE LA SOLICITUD                    */}
      {/* ========================================================= */}
      {solicitudDetalle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex items-center gap-4">
                {solicitudDetalle.logo_url ? (
                  <a
                    href={solicitudDetalle.logo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block"
                    title="Click para ver logo en tamaño completo"
                  >
                    <img
                      src={solicitudDetalle.logo_url}
                      alt="Logo"
                      className="w-16 h-16 rounded-2xl object-contain bg-white border border-gray-200 p-1.5 shadow-sm group-hover:opacity-90 transition-all"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <ExternalLink size={16} />
                    </div>
                  </a>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 font-black text-xl flex items-center justify-center border border-violet-200 shadow-sm">
                    {(solicitudDetalle.nombre_academia || solicitudDetalle.nombre_club || 'AC').substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    {solicitudDetalle.nombre_academia || solicitudDetalle.nombre_club}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      solicitudDetalle.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' :
                      solicitudDetalle.estado === 'En Revisión' ? 'bg-blue-100 text-blue-700' :
                      solicitudDetalle.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {solicitudDetalle.estado}
                    </span>
                    <span className="text-xs text-gray-500">
                      Solicitado el {new Date(solicitudDetalle.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSolicitudDetalle(null)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Malla de Datos de Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <User size={12} /> Director / Representante
                  </p>
                  <p className="font-bold text-gray-900 text-sm">{solicitudDetalle.nombre_director || '—'}</p>
                  <p className="text-xs text-gray-500">{solicitudDetalle.rol_director || 'Director Principal'}</p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Mail size={12} /> Correo Electrónico
                  </p>
                  <p className="font-bold text-gray-900 text-sm truncate" title={solicitudDetalle.email}>{solicitudDetalle.email}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold">Usuario asignado para login</p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Phone size={12} /> Teléfono WhatsApp
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-gray-900">
                      <span>{getCountryFlag(solicitudDetalle.pais)}</span>
                      <span>{solicitudDetalle.telefono || '—'}</span>
                    </div>
                    <button
                      onClick={() => abrirChatWhatsAppDirecto(solicitudDetalle)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <MessageCircle size={13} /> Chat
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <MapPin size={12} /> Ubicación
                  </p>
                  <p className="font-bold text-gray-900 text-sm">
                    {solicitudDetalle.ciudad ? `${solicitudDetalle.ciudad}, ` : ''}{solicitudDetalle.pais || 'Colombia'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getCountryFlag(solicitudDetalle.pais)} Prefijo inteligente: +{formatInternationalWhatsAppPhone(solicitudDetalle.telefono, solicitudDetalle.pais).substring(0, 2)}...
                  </p>
                </div>
              </div>

              {/* Jugadores y Código Referido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Users size={12} /> Jugadores Aproximados
                  </p>
                  <p className="font-black text-slate-800 text-lg">
                    {solicitudDetalle.jugadores_estimados || solicitudDetalle.estimado_alumnos || 'No especificado'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Shield size={12} /> Referido / Embajador
                  </p>
                  {solicitudDetalle.codigo_referido ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-mono font-black text-xs rounded-lg border border-amber-300">
                        {solicitudDetalle.codigo_referido}
                      </span>
                      <span className="text-[11px] text-gray-500 capitalize">
                        Fuente: {solicitudDetalle.fuente_referido || 'Manual'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 font-medium">Registro directo (Sin embajador)</p>
                  )}
                </div>
              </div>

              {/* Mensaje remitido por la academia */}
              {solicitudDetalle.mensaje && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Mensaje remitido por el club:
                  </p>
                  <p className="text-sm text-slate-700 italic leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-100">
                    &ldquo;{solicitudDetalle.mensaje}&rdquo;
                  </p>
                </div>
              )}

              {/* SECCIÓN DE SLUG PERSONALIZADO */}
              <div className="bg-violet-50/70 border border-violet-200/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="text-violet-600" size={18} />
                    <h4 className="text-sm font-black text-slate-900">Slug Personalizado y Enlace del Club</h4>
                  </div>
                  {solicitudDetalle.estado === 'Aprobado' && slugEditado !== slugOriginal && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Modificación pendiente de guardar
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  Este slug definirá la URL de acceso directo para el director, entrenadores y familias.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 flex items-center bg-white border border-violet-300 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-violet-500">
                    <span className="text-xs text-gray-400 font-mono select-none">
                      {getBaseOrigin()}/
                    </span>
                    <input
                      type="text"
                      value={slugEditado}
                      onChange={(e) => setSlugEditado(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                      className="flex-1 text-xs font-mono font-bold text-violet-700 bg-transparent outline-none pl-1"
                      placeholder="mi-academia"
                    />
                    <span className="text-xs text-gray-400 font-mono select-none">
                      /login
                    </span>
                  </div>

                  {solicitudDetalle.estado === 'Aprobado' && (
                    <button
                      onClick={guardarNuevoSlug}
                      disabled={guardandoSlug || !slugEditado || slugEditado === slugOriginal}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0"
                    >
                      {guardandoSlug ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Guardar Slug
                    </button>
                  )}
                </div>

                {solicitudDetalle.estado === 'Aprobado' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <a
                      href={`${getBaseOrigin()}/${slugOriginal || slugEditado}/login`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Probar enlace del club <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* NOTAS DEL ADMINISTRADOR */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Notas del Administrador (Uso Interno)
                  </label>
                  <button
                    onClick={guardarNotasAdmin}
                    disabled={guardandoNotas}
                    className="text-xs text-violet-600 hover:text-violet-700 font-bold hover:underline"
                  >
                    {guardandoNotas ? 'Guardando...' : 'Guardar notas'}
                  </button>
                </div>
                <textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                  placeholder="Añade anotaciones sobre conversaciones, acuerdos comerciales o validaciones..."
                />
              </div>

              {/* ALERTA O CREDENCIALES SI YA ESTÁ APROBADO */}
              {solicitudDetalle.estado === 'Aprobado' ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-600" size={18} />
                      <h4 className="text-sm font-black text-emerald-900">Club Activo en Producción</h4>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      Usuario: <span className="font-mono font-bold">{solicitudDetalle.email}</span> | Contraseña inicial: <span className="font-mono font-bold">Master2026*</span>
                    </p>
                  </div>

                  <button
                    onClick={() => prepararEnvioCredenciales(solicitudDetalle)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex-shrink-0"
                  >
                    <Send size={14} /> Enviar Credenciales por WA
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-xs text-emerald-800 leading-relaxed font-medium space-y-1">
                    <p>
                      Al hacer clic en <strong>Aprobar y Crear Club</strong>, el sistema creará automáticamente el club en producción con el slug <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-bold font-mono">/{slugEditado || generarSlugSugerido(solicitudDetalle.nombre_academia)}</code> y creará la cuenta de Director para <span className="font-bold">{solicitudDetalle.email}</span> con clave inicial <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-bold font-mono">Master2026*</code>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal Acciones */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSolicitudDetalle(null)}
                  className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm w-full sm:w-auto"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => abrirChatWhatsAppDirecto(solicitudDetalle)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 font-bold rounded-xl transition-colors text-xs w-full sm:w-auto"
                >
                  <MessageCircle size={15} className="text-emerald-600" />
                  Escribir por WhatsApp
                </button>
              </div>

              {solicitudDetalle.estado !== 'Aprobado' && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => actualizarSolicitud(solicitudDetalle.id, 'En Revisión')}
                    className="px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-colors text-xs"
                  >
                    En Revisión
                  </button>
                  <button
                    onClick={() => actualizarSolicitud(solicitudDetalle.id, 'Rechazado')}
                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors text-xs"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => actualizarSolicitud(solicitudDetalle.id, 'Aprobado')}
                    disabled={procesandoAprobacion}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 text-sm flex items-center gap-1.5"
                  >
                    {procesandoAprobacion ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Creando Club...
                      </>
                    ) : (
                      <>Aprobar y Crear Club</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ENVÍO DE CREDENCIALES POR WHATSAPP                 */}
      {/* ========================================================= */}
      {modalCredenciales && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Enviar Credenciales de Acceso</h3>
                  <p className="text-xs text-white/80">
                    Para {modalCredenciales.nombre_director} ({modalCredenciales.nombre_academia || modalCredenciales.nombre_club})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCredenciales(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
              <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between border border-gray-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="text-base">{getCountryFlag(modalCredenciales.pais)}</span>
                  <span>Destinatario:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatInternationalWhatsAppPhone(modalCredenciales.telefono, modalCredenciales.pais) || modalCredenciales.telefono}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {modalCredenciales.pais || 'Internacional'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Mensaje predeterminado de bienvenida (Editable):
                </label>
                <textarea
                  value={mensajeCredenciales}
                  onChange={(e) => setMensajeCredenciales(e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-2xl text-xs font-mono bg-gray-50 h-56 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p>
                  Puedes abrir directamente WhatsApp Web/App con el mensaje listo para enviar, o despacharlo a través del Bot automático de WhatsApp si tu instancia está vinculada.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                onClick={copiarMensajeCredenciales}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiado ? '¡Copiado!' : 'Copiar Texto'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={enviarCredencialesPorBot}
                  disabled={enviandoBot}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  title="Enviar a través de Evolution API si está conectada"
                >
                  {enviandoBot ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar por Bot
                </button>

                <button
                  onClick={abrirWhatsAppConCredenciales}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={15} />
                  Abrir WhatsApp (wa.me)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
