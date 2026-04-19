"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Download, UserPlus, Search, ChevronDown, Check, X, User, Key, Mail, ShieldCheck, Smartphone, ExternalLink, Eye, HeartPulse, Calendar, MapPin, CreditCard, Activity, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectorioMiembros() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pestaña, setPestaña] = useState<'Registrados' | 'Pendientes'>('Registrados');
  const [filtroGrupo, setFiltroGrupo] = useState('Todos');
  const [isModalInvitacionOpen, setIsModalInvitacionOpen] = useState(false);
  const [emailAcceso, setEmailAcceso] = useState('');
  const [generandoAcceso, setGenerandoAcceso] = useState(false);
  const [isModalDetallesOpen, setIsModalDetallesOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);

  const cargarJugadores = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .neq('rol', 'Director')
      .order('rol', { ascending: false })
      .order('nombres', { ascending: true });

    if (error) {
       toast.error(`Error de conexión: ${error.message}`);
    } else {
       setJugadores(data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarJugadores();
  }, []);

  const aprobarJugador = async (miembro: any) => {
    const toastId = toast.loading(`Aprobando y creando acceso para ${miembro.nombres}...`);
    
    // 1. Cambiar estado a Activo
    const { error: errorEstado } = await supabase.from('perfiles').update({ estado_miembro: 'Activo' }).eq('id', miembro.id);
    
    if (errorEstado) {
      toast.error("Error al cambiar estado: " + errorEstado.message, { id: toastId });
      return;
    }

    // 2. Si tiene email, intentar crear el usuario de acceso automáticamente
    const emailParaAcceso = miembro.email_contacto || miembro.email;
    
    if (emailParaAcceso) {
      try {
        const res = await fetch('/api/admin/crear-usuario', {
          method: 'POST',
          body: JSON.stringify({ 
            email: emailParaAcceso, 
            password: 'Gibbor2026*', 
            rol: miembro.rol || 'Futbolista', 
            perfilId: miembro.id 
          })
        });
        
        if (res.ok) {
          toast.success(`${miembro.nombres} ya puede ingresar con su correo y clave: Gibbor2026*`, { id: toastId, duration: 6000 });
        } else {
          toast.warning(`${miembro.nombres} aprobado, pero el acceso debe crearse manualmente (posible correo duplicado).`, { id: toastId });
        }
      } catch (err) {
        toast.warning(`${miembro.nombres} aprobado, pero hubo un error creando el acceso.`, { id: toastId });
      }
    } else {
      toast.success(`${miembro.nombres} aprobado (Sin correo para crear acceso).`, { id: toastId });
    }
    
    cargarJugadores();
  };

  const rechazarJugador = async (id: string, nombreCompleto: string) => {
    if (!window.confirm(`¿Seguro que deseas rechazar la solicitud de ${nombreCompleto}?`)) return;
    const toastId = toast.loading(`Procesando...`);
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (!error) {
       toast.success("Solicitud rechazada correctamente.", { id: toastId });
       cargarJugadores();
    } else {
       toast.error("Error al procesar el rechazo.", { id: toastId });
    }
  };

  const jugadoresFiltrados = jugadores.filter(jugador => {
    const cumplePestaña = pestaña === 'Registrados' ? jugador.estado_miembro === 'Activo' : jugador.estado_miembro === 'Pendiente';
    const coincideBusqueda = (jugador.nombres + ' ' + jugador.apellidos).toLowerCase().includes(busqueda.toLowerCase()) || (jugador.documento_identidad || '').includes(busqueda);
    const coincideGrupo = filtroGrupo === 'Todos' || jugador.grupos === filtroGrupo;
    return cumplePestaña && coincideBusqueda && coincideGrupo;
  });

  const gruposDisponibles = ['Todos', ...Array.from(new Set(jugadores.map(j => j.grupos).filter(Boolean)))];

  const exportarAExcel = () => {
    if (jugadoresFiltrados.length === 0) return toast.error("No hay datos");
    const cabeceras = ['Nombres', 'Apellidos', 'Rol', 'Categoria', 'Telefono'];
    const filas = jugadoresFiltrados.map(j => [`"${j.nombres}"`, `"${j.apellidos}"`, `"${j.rol}"`, `"${j.grupos || '---'}"`, `"${j.telefono || ''}"`]);
    const contenidoCSV = [cabeceras.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Gibbor_Miembros.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="text-orange-500 w-8 h-8" /> Gestión de Miembros
          </h1>
          <p className="text-slate-500 text-sm mt-1">Control administrativo de deportistas y entrenadores.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsModalInvitacionOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-bold text-sm shadow-xl shadow-slate-900/10"><UserPlus className="w-4 h-4" /> Invitar</button>
          <button onClick={exportarAExcel} className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"><Download className="w-4 h-4" /> Exportar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto">
            <button onClick={() => setPestaña('Registrados')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pestaña === 'Registrados' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm' : 'text-slate-500'}`}>Miembros</button>
            <button onClick={() => setPestaña('Pendientes')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pestaña === 'Pendientes' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm' : 'text-slate-500'}`}>Solicitudes</button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto flex-1 lg:justify-end">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm transition-all" />
            </div>
            <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 font-medium">
              {gruposDisponibles.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4 md:px-6 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[140px] md:max-w-none truncate">Miembro</th>
                <th className="p-4 md:px-6">Rol / Categoria</th>
                <th className="p-4 md:px-6 hidden md:table-cell">Contacto</th>
                <th className="p-4 md:px-6 text-center">Estado</th>
                <th className="p-4 md:px-6 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {cargando ? (
                <tr><td colSpan={5} className="p-20 text-center"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-400 font-bold">Cargando...</p></td></tr>
              ) : jugadoresFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center"><div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="text-slate-300 w-8 h-8" /></div><p className="text-slate-400 font-bold">No se encontraron miembros</p></td></tr>
              ) : (
                jugadoresFiltrados.map((jugador) => (
                  <tr key={jugador.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4 md:px-6 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[140px] md:max-w-none">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase text-[10px]">{jugador.nombres.charAt(0)}</div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs md:text-sm">{jugador.nombres} {jugador.apellidos}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter truncate">{jugador.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:px-6">
                      <span className={`text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${jugador.rol === 'Entrenador' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{jugador.rol}</span>
                      <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate max-w-[80px] md:max-w-none">{jugador.grupos || 'Sin grupo'}</p>
                    </td>
                    <td className="p-4 md:px-6 text-slate-600 dark:text-slate-300 font-medium hidden md:table-cell">{jugador.telefono || '---'}</td>
                    <td className="p-4 md:px-6 text-center">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${jugador.estado_miembro === 'Inactivo' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>{jugador.estado_miembro === 'Inactivo' ? 'Inact' : 'Activo'}</span>
                    </td>
                    <td className="p-4 md:px-6 text-right">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <button onClick={() => { 
                          setSolicitudSeleccionada(jugador); 
                          // Priorizar email de contacto del formulario sobre el email de auth (que estará vacío inicialmente)
                          const emailSugerido = jugador.email_contacto || jugador.email || '';
                          setEmailAcceso(emailSugerido); 
                          setIsModalDetallesOpen(true); 
                        }} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-all" title="Ver Ficha y Accesos"><Eye className="w-5 h-5" /></button>
                        {pestaña === 'Registrados' ? (
                          <button onClick={() => router.push(`/director/miembros/${jugador.id}`)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-2 hidden md:block"><ExternalLink className="w-5 h-5" /></button>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => aprobarJugador(jugador)} className="bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"><Check className="w-4 h-4" /></button>
                            <button onClick={() => rechazarJugador(jugador.id, jugador.nombres)} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE INVITACIÓN */}
      {isModalInvitacionOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6"><Mail className="w-10 h-10 text-orange-500" /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Invitar a un Miembro</h3>
              <p className="text-slate-500 text-sm font-medium mt-3 px-6">Envía este enlace a los padres para que se registren por su cuenta.</p>
              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Link de Registro</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{typeof window !== 'undefined' ? `${window.location.origin}/registro?invite=true` : ''}</div>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/registro?invite=true`); toast.success("Copiado!"); }} className="p-4 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all"><Download className="w-5 h-5 rotate-270" /></button>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => { const msg = `¡Hola! Únete a nuestra academia: ${window.location.origin}/registro?invite=true`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"><Smartphone className="w-5 h-5" /> Compartir WhatsApp</button>
                <button onClick={() => setIsModalInvitacionOpen(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES Y ACCESOS */}
      {isModalDetallesOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20"><User className="text-white w-7 h-7" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Ficha del Miembro</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2"><span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span> {pestaña === 'Pendientes' ? 'Solicitud por Validar' : 'Activo en Plataforma'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalDetallesOpen(false)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white shadow-sm"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400"><CreditCard className="w-4 h-4" /><p className="text-[10px] font-black uppercase tracking-widest">Identificación</p></div>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{solicitudSeleccionada.nombres} {solicitudSeleccionada.apellidos}</p>
                  <p className="text-sm font-bold text-slate-500">Documento: {solicitudSeleccionada.documento_identidad || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-slate-400 mb-3"><Smartphone className="w-4 h-4" /><p className="text-[10px] font-black uppercase tracking-widest">Contacto</p></div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{solicitudSeleccionada.telefono || 'Sin teléfono'}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">{solicitudSeleccionada.email || 'Sin correo'}</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-6 text-white border-l-4 border-orange-500 shadow-xl">
                <div className="flex items-center gap-4 mb-4"><ShieldCheck className="text-orange-400 w-6 h-6" /><h4 className="text-sm font-black uppercase italic tracking-widest">Responsable</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nombre</p><p className="text-sm font-black">{solicitudSeleccionada.acudiente_nombre || 'No registrado'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ID</p><p className="text-sm font-black">{solicitudSeleccionada.acudiente_identificacion || 'N/A'}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><HeartPulse className="w-6 h-6 text-red-500 mx-auto mb-2" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sangre</p><p className="text-xl font-black text-slate-800 dark:text-white">{solicitudSeleccionada.tipo_sangre || 'N/A'}</p></div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">EPS</p><p className="text-sm font-black text-slate-800 dark:text-white truncate">{solicitudSeleccionada.eps || 'N/A'}</p></div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><Download className="w-6 h-6 text-orange-500 mx-auto mb-2 rotate-180" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Talla</p><p className="text-xl font-black text-slate-800 dark:text-white">{solicitudSeleccionada.talla_uniforme || 'N/A'}</p></div>
              </div>

              <div className={`p-6 rounded-[2rem] border-2 ${solicitudSeleccionada.patologias ? 'bg-red-50 border-red-100 dark:bg-red-950 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <h4 className="text-xs font-black uppercase tracking-widest mb-2">Notas Médicas / Alergias</h4>
                <p className="text-sm font-bold text-slate-500">{solicitudSeleccionada.patologias || 'Sin observaciones.'}</p>
              </div>

              {/* SECCIÓN DE EXPEDIENTE DIGITAL */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="text-orange-600 w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black uppercase italic tracking-widest">Expediente Digital</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {solicitudSeleccionada.doc_jugador_url ? (
                    <a href={solicitudSeleccionada.doc_jugador_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:border-orange-500 transition-all group">
                      <FileText className="w-8 h-8 text-slate-400 group-hover:text-orange-500 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-500">ID Jugador</p>
                      <span className="text-[9px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">Disponible</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50">
                      <X className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-400">ID Jugador</p>
                    </div>
                  )}

                  {solicitudSeleccionada.doc_eps_url ? (
                    <a href={solicitudSeleccionada.doc_eps_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:border-orange-500 transition-all group">
                      <ShieldCheck className="w-8 h-8 text-slate-400 group-hover:text-orange-500 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-500">Carné EPS</p>
                      <span className="text-[9px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">Disponible</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50">
                      <X className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-400">Carné EPS</p>
                    </div>
                  )}

                  {solicitudSeleccionada.doc_acudiente_url ? (
                    <a href={solicitudSeleccionada.doc_acudiente_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:border-orange-500 transition-all group">
                      <User className="w-8 h-8 text-slate-400 group-hover:text-orange-500 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-500">ID Acudiente</p>
                      <span className="text-[9px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">Disponible</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50">
                      <X className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-400">ID Acudiente</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center"><Key className="text-orange-600 w-5 h-5" /></div><h4 className="text-sm font-black uppercase italic tracking-widest">Accesos Gibbor App</h4></div>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
                  <input type="email" value={emailAcceso} onChange={(e) => setEmailAcceso(e.target.value)} placeholder="Correo electrónico" className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                  <div className="flex flex-col gap-3">
                    {solicitudSeleccionada.email && pestaña === 'Registrados' ? (
                      <button onClick={async () => { 
                        if(!window.confirm("¿Seguro que deseas resetear la clave de este usuario?")) return; 
                        setGenerandoAcceso(true); 
                        const tid = toast.loading("Reseteando clave..."); 
                        const res = await fetch('/api/admin/reset-password', { 
                          method: 'POST', 
                          body: JSON.stringify({ userId: solicitudSeleccionada.id, newPassword: 'Gibbor2026*' }) 
                        }); 
                        if(res.ok) toast.success("Clave reseteada a Gibbor2026*", {id: tid});
                        else toast.error("Error al resetear clave", {id: tid});
                        setGenerandoAcceso(false); 
                      }} disabled={generandoAcceso} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Resetear Clave</button>
                    ) : (
                      <button onClick={async () => { 
                        if(!emailAcceso) return toast.error("Por favor ingresa un correo"); 
                        setGenerandoAcceso(true); 
                        const tid = toast.loading("Activando acceso...");
                        try {
                          const res = await fetch('/api/admin/crear-usuario', { 
                            method: 'POST', 
                            body: JSON.stringify({ 
                              email: emailAcceso, 
                              password: 'Gibbor2026*', 
                              rol: solicitudSeleccionada.rol || 'Futbolista', 
                              perfilId: solicitudSeleccionada.id 
                            }) 
                          }); 
                          const data = await res.json();
                          if(res.ok) { 
                            toast.success("¡Acceso activado correctamente!", { id: tid }); 
                            setIsModalDetallesOpen(false); 
                            cargarJugadores(); 
                          } else { 
                            toast.error("Error: " + (data.error || "Fallo desconocido"), { id: tid }); 
                          }
                        } catch (err) {
                           toast.error("Error de conexión", { id: tid });
                        }
                        setGenerandoAcceso(false); 
                      }} disabled={generandoAcceso} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Activar Acceso</button>
                    )}
                    <button onClick={() => window.open(`https://wa.me/${solicitudSeleccionada.telefono?.replace(/\D/g, '')}?text=Acceso Activado.`, '_blank')} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Smartphone className="w-4 h-4" /> Notificar WhatsApp</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
              {pestaña === 'Pendientes' ? (
                <>
                  <button onClick={() => { setIsModalDetallesOpen(false); rechazarJugador(solicitudSeleccionada.id, solicitudSeleccionada.nombres); }} className="flex-1 bg-white border-2 border-red-500 text-red-500 py-4 rounded-2xl font-black uppercase text-xs">Rechazar</button>
                  <button onClick={() => { setIsModalDetallesOpen(false); aprobarJugador(solicitudSeleccionada); }} className="flex-[1.5] bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3"><Check className="w-5 h-5" /> Aprobar</button>
                </>
              ) : (
                <button onClick={() => setIsModalDetallesOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Cerrar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
