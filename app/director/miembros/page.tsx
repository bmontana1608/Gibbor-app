'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Download, UserPlus, Search, ChevronDown, Check, X, User, Key, Mail, ShieldCheck, Smartphone, ExternalLink, Eye, HeartPulse, Calendar, MapPin, CreditCard, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectorioMiembros() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos'); 
  const [rolFiltro, setRolFiltro] = useState('Todos');
  const [pestaña, setPestaña] = useState<'Registrados' | 'Pendientes'>('Registrados');

  // Estados para gestión de acceso
  const [miembroAgestionar, setMiembroAgestionar] = useState<any>(null);
  const [isModalAccesoOpen, setIsModalAccesoOpen] = useState(false);
  const [isModalInvitacionOpen, setIsModalInvitacionOpen] = useState(false);
  const [emailAcceso, setEmailAcceso] = useState('');
  const [generandoAcceso, setGenerandoAcceso] = useState(false);
  const [isModalDetallesOpen, setIsModalDetallesOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);

  // Sincronizar correo automáticamente al gestionar acceso
  useEffect(() => {
    if (miembroAgestionar) {
      setEmailAcceso(miembroAgestionar.email || '');
    }
  }, [miembroAgestionar]);

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
    } else if (data) {
       setJugadores(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarJugadores();
  }, []);

  const aprobarJugador = async (id: string, nombreCompleto: string) => {
    const toastId = toast.loading(`Aprobando a ${nombreCompleto}...`);
    const { error } = await supabase.from('perfiles').update({ estado_miembro: 'Activo' }).eq('id', id);
    if (!error) {
      toast.success(`${nombreCompleto} ha sido aprobado.`, { id: toastId });
      cargarJugadores();
    } else {
      toast.error('Error: ' + error.message, { id: toastId });
    }
  };

  const rechazarJugador = async (id: string, nombreCompleto: string) => {
    if (!window.confirm(`¿Seguro de rechazar a ${nombreCompleto}?`)) return;
    const toastId = toast.loading(`Eliminando solicitud...`);
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (!error) {
      toast.success(`Solicitud eliminada.`, { id: toastId });
      cargarJugadores();
    } else {
      toast.error('Error: ' + error.message, { id: toastId });
    }
  };

  const listaAVisualizar = pestaña === 'Registrados' 
    ? jugadores.filter(j => j.estado_miembro !== 'Pendiente') 
    : jugadores.filter(j => j.estado_miembro === 'Pendiente');
  
  const jugadoresFiltrados = listaAVisualizar.filter(jugador => {
    const coincideGrupo = grupoFiltro === 'Todos' || jugador.grupos === grupoFiltro;
    const coincideEstado = estadoFiltro === 'Todos' || (jugador.estado_miembro || 'Activo') === estadoFiltro;
    const coincideRol = rolFiltro === 'Todos' || jugador.rol === rolFiltro;
    const nombreCompleto = `${jugador.nombres} ${jugador.apellidos}`.toLowerCase();
    const coincideBusqueda = nombreCompleto.includes(busqueda.toLowerCase());
    return coincideGrupo && coincideBusqueda && coincideEstado && coincideRol;
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
            <Users className="text-orange-500 w-7 h-7" /> Directorio de Miembros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestión de staff, jugadores y accesos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsModalInvitacionOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-orange-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
            <Mail className="w-4 h-4" /> Invitación
          </button>
          <button onClick={exportarAExcel} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => router.push('/director/miembros/nuevo')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
            <UserPlus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button onClick={() => setPestaña('Registrados')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${pestaña === 'Registrados' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Plantilla Oficial
        </button>
        <button onClick={() => setPestaña('Pendientes')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${pestaña === 'Pendientes' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Solicitudes Pendientes {listaAVisualizar.length > 0 && pestaña === 'Pendientes' && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{listaAVisualizar.length}</span>}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none text-sm dark:text-white" />
        </div>
        <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none text-sm dark:text-white">
          <option value="Todos">Todos los roles</option>
          <option value="Futbolista">Solo Futbolistas</option>
          <option value="Entrenador">Solo Entrenadores</option>
        </select>
        <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none text-sm dark:text-white">
          {gruposDisponibles.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none text-sm dark:text-white">
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
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
          <tbody className="divide-y divide-slate-100 text-sm">
            {cargando ? (
              <tr><td colSpan={5} className="p-10 text-center animate-pulse text-slate-400 font-bold">Cargando Gibbor Admin...</td></tr>
            ) : jugadoresFiltrados.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400">Sin resultados</td></tr>
            ) : (
              jugadoresFiltrados.map((jugador) => (
                <tr key={jugador.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4 md:px-6 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[140px] md:max-w-none">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                        {jugador.nombres.charAt(0)}
                      </div>
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
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${jugador.estado_miembro === 'Inactivo' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>
                      {jugador.estado_miembro === 'Inactivo' ? 'Inact' : 'Activo'}
                    </span>
                  </td>
                  <td className="p-4 md:px-6 text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <button 
                        onClick={() => { setSolicitudSeleccionada(jugador); setIsModalDetallesOpen(true); }}
                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-all"
                        title="Ver Ficha y Accesos"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {pestaña === 'Registrados' ? (
                        <button onClick={() => router.push(`/director/miembros/${jugador.id}`)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-2 hidden md:block"><ExternalLink className="w-5 h-5" /></button>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => aprobarJugador(jugador.id, jugador.nombres)} className="bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"><Check className="w-4 h-4" /></button>
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

      {isModalAccesoOpen && miembroAgestionar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
            <div className="p-8 pb-0 relative">
              <button onClick={() => setIsModalAccesoOpen(false)} className="absolute right-6 top-8 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-6 h-6" /></button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shadow-sm border border-orange-100">
                  <ShieldCheck className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Acceso App Gibbor</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-1.5">{miembroAgestionar.rol}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
               <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Mail className="w-3.5 h-3.5 text-orange-500" /> Correo electrónico
                    </label>
                    <input type="email" value={emailAcceso} onChange={(e) => setEmailAcceso(e.target.value)} placeholder="ejemplo@correo.com" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 text-sm" />
                  </div>
                  <div className="pt-4 space-y-3">
                    {miembroAgestionar.email ? (
                      <button 
                        onClick={async () => {
                           if (!window.confirm("¿Seguro de restablecer la clave a Gibbor2026*?")) return;
                           setGenerandoAcceso(true);
                           const toastId = toast.loading("Restableciendo clave...");
                           try {
                             const res = await fetch('/api/admin/reset-password', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ userId: miembroAgestionar.id, newPassword: 'Gibbor2026*' })
                             });
                             if (!res.ok) throw new Error('Error al resetear');
                             toast.success("¡Clave restablecida a Gibbor2026*! 🔑", { id: toastId });
                           } catch (error: any) {
                             toast.error("Fallo: " + error.message, { id: toastId });
                           } finally {
                             setGenerandoAcceso(false);
                           }
                        }}
                        disabled={generandoAcceso}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-3"
                      >
                        {generandoAcceso ? 'Procesando...' : <><Key className="w-5 h-5" /> Restablecer Clave</>}
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                           if (!emailAcceso.includes('@')) return toast.error("Ingresa un correo válido");
                           setGenerandoAcceso(true);
                           const toastId = toast.loading("Activando acceso...");
                           try {
                             const res = await fetch('/api/admin/crear-usuario', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 email: emailAcceso,
                                 password: 'Gibbor2026*',
                                 rol: miembroAgestionar.rol,
                                 perfilId: miembroAgestionar.id
                               })
                             });
                             const data = await res.json();
                             if (!res.ok) throw new Error(data.error || 'Fallo');
                             toast.success("¡Acceso activado! ✨", { id: toastId });
                             setIsModalAccesoOpen(false);
                             cargarJugadores();
                           } catch (error: any) {
                             toast.error("Error: " + error.message, { id: toastId });
                           } finally {
                             setGenerandoAcceso(false);
                           }
                        }}
                        disabled={generandoAcceso}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-orange-600/20"
                      >
                        {generandoAcceso ? 'Cargando...' : 'Activar Acceso'}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const mensaje = `Hola *${miembroAgestionar.nombres}* 👋, acceso a *Gibbor App* activado.\n\n👤 *Usuario:* ${emailAcceso}\n🔑 *Clave:* Gibbor2026*`;
                        window.open(`https://wa.me/${miembroAgestionar.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`, '_blank');
                      }}
                      className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                    >
                      <Smartphone className="w-5 h-5" /> WhatsApp
                    </button>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DE SOLICITUD */}
      {isModalDetallesOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <User className="text-white w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Ficha de Solicitud</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span> Pendiente de Validación
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalDetallesOpen(false)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              
              {/* 1. Perfil Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                    <CreditCard className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Identificación</p>
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{solicitudSeleccionada.nombres} {solicitudSeleccionada.apellidos}</p>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">CC/TI: {solicitudSeleccionada.documento_identidad || 'N/A'}</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    Nacimiento: {solicitudSeleccionada.fecha_nacimiento || '---'}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-3 text-slate-400 mb-3">
                    <Smartphone className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Contacto Directo</p>
                  </div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{solicitudSeleccionada.telefono || 'Sin teléfono'}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">{solicitudSeleccionada.email || 'Sin correo'}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" /> {solicitudSeleccionada.direccion || 'Sin dirección'}
                  </div>
                </div>
              </div>

              {/* 2. Responsable Legal */}
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white border-l-4 border-orange-500 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <ShieldCheck className="text-orange-400 w-6 h-6" />
                  <h4 className="text-sm font-black uppercase italic tracking-widest">Acudiente / Representante</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nombre Completo</p>
                    <p className="text-sm font-black border-b border-white/10 pb-2">{solicitudSeleccionada.acudiente_nombre || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Identificación</p>
                    <p className="text-sm font-black border-b border-white/10 pb-2">{solicitudSeleccionada.acudiente_identificacion || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* 3. Salud y Tallas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl shadow-sm text-center">
                  <HeartPulse className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sangre</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{solicitudSeleccionada.tipo_sangre || '--'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl shadow-sm text-center">
                  <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">EPS</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{solicitudSeleccionada.eps || 'No registrada'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl shadow-sm text-center">
                  <Download className="w-6 h-6 text-orange-500 mx-auto mb-2" style={{transform: 'rotate(180deg)'}} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Talla Uniforme</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white uppercase">{solicitudSeleccionada.talla_uniforme || 'N/A'}</p>
                </div>
              </div>

              {/* 4. Patologías */}
              <div className={`p-6 rounded-[2rem] border-2 ${solicitudSeleccionada.patologias ? 'bg-red-50 border-red-100 dark:bg-red-500/5 dark:border-red-500/20' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-800'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Activity className={`w-5 h-5 ${solicitudSeleccionada.patologias ? 'text-red-500' : 'text-slate-400'}`} />
                  <h4 className={`text-xs font-black uppercase tracking-widest ${solicitudSeleccionada.patologias ? 'text-red-700 dark:text-red-400' : 'text-slate-500'}`}>Observaciones Médicas / Alergias</h4>
                </div>
                <p className={`text-sm font-bold ${solicitudSeleccionada.patologias ? 'text-red-600 dark:text-red-300' : 'text-slate-400'}`}>
                  {solicitudSeleccionada.patologias || 'El jugador no reportó patologías o alergias conocidas.'}
                </p>
              </div>

              {/* 5. Contacto Emergencia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center gap-3 mb-1 text-slate-400">
                  < Smartphone className="w-4 h-4 text-orange-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">En caso de emergencia avisar a:</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nombre</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{solicitudSeleccionada.emergencia_nombre || '---'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Teléfono</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{solicitudSeleccionada.emergencia_telefono || '---'}</p>
                </div>
              </div>

              {/* 6. Gestión de Accesos (NUEVO: Integrado aquí para móviles) */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Key className="text-orange-600 dark:text-orange-400 w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black uppercase italic tracking-widest text-slate-800 dark:text-white">Gestión de Acceso App</h4>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Mail className="w-3.5 h-3.5 text-orange-500" /> Correo de Acceso
                    </label>
                    <input 
                      type="email" 
                      value={emailAcceso} 
                      onChange={(e) => setEmailAcceso(e.target.value)} 
                      placeholder="ejemplo@correo.com" 
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 dark:text-slate-200 text-sm" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {solicitudSeleccionada.email ? (
                      <button 
                        onClick={async () => {
                           if (!window.confirm("¿Seguro de restablecer la clave a Gibbor2026*?")) return;
                           setGenerandoAcceso(true);
                           const toastId = toast.loading("Restableciendo clave...");
                           try {
                             const res = await fetch('/api/admin/reset-password', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ userId: solicitudSeleccionada.id, newPassword: 'Gibbor2026*' })
                             });
                             if (!res.ok) throw new Error('Error al resetear');
                             toast.success("¡Clave restablecida a Gibbor2026*! 🔑", { id: toastId });
                           } catch (error: any) {
                             toast.error("Fallo: " + error.message, { id: toastId });
                           } finally {
                             setGenerandoAcceso(false);
                           }
                        }}
                        disabled={generandoAcceso}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-3"
                      >
                        {generandoAcceso ? 'Procesando...' : <><Key className="w-5 h-5" /> Resetear Clave</>}
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                           if (!emailAcceso.includes('@')) return toast.error("Ingresa un correo válido");
                           setGenerandoAcceso(true);
                           const toastId = toast.loading("Activando acceso...");
                           try {
                             const res = await fetch('/api/admin/crear-usuario', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 email: emailAcceso,
                                 password: 'Gibbor2026*',
                                 rol: solicitudSeleccionada.rol,
                                 perfilId: solicitudSeleccionada.id
                               })
                             });
                             const data = await res.json();
                             if (!res.ok) throw new Error(data.error || 'Fallo');
                             toast.success("¡Acceso activado! ✨", { id: toastId });
                             setIsModalDetallesOpen(false);
                             cargarJugadores();
                           } catch (error: any) {
                             toast.error("Error: " + error.message, { id: toastId });
                           } finally {
                             setGenerandoAcceso(false);
                           }
                        }}
                        disabled={generandoAcceso}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-orange-600/20"
                      >
                        {generandoAcceso ? 'Cargando...' : 'Activar Acceso App'}
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        const mensaje = `Hola *${solicitudSeleccionada.nombres}* 👋, acceso a *Gibbor App* activado.\n\n👤 *Usuario:* ${emailAcceso}\n🔑 *Clave:* Gibbor2026*`;
                        window.open(`https://wa.me/${solicitudSeleccionada.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`, '_blank');
                      }}
                      className="w-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                    >
                      <Smartphone className="w-5 h-5" /> Notificar por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
              {pestaña === 'Pendientes' ? (
                <>
                  <button 
                    onClick={() => { setIsModalDetallesOpen(false); rechazarJugador(solicitudSeleccionada.id, solicitudSeleccionada.nombres); }}
                    className="flex-1 bg-white dark:bg-slate-800 border-2 border-red-500 text-red-500 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 active:scale-95"
                  >
                    Rechazar Solicitud
                  </button>
                  <button 
                    onClick={() => { setIsModalDetallesOpen(false); aprobarJugador(solicitudSeleccionada.id, solicitudSeleccionada.nombres); }}
                    className="flex-[1.5] bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Check className="w-5 h-5" /> Aprobar y Guardar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsModalDetallesOpen(false)}
                  className="w-full bg-slate-900 dark:bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all active:scale-95"
                >
                  Cerrar Ficha
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
