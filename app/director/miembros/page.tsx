'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Download, UserPlus, Search, ChevronDown, Check, X, User, Key, Mail, ShieldCheck, Smartphone, ExternalLink } from 'lucide-react';
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
              <th className="p-4 md:px-6 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Miembro</th>
              <th className="p-4 md:px-6">Rol / Categoria</th>
              <th className="p-4 md:px-6">Contacto</th>
              <th className="p-4 md:px-6 text-center">Estado</th>
              <th className="p-4 md:px-6 text-right">Accesos</th>
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
                  <td className="p-4 md:px-6 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                        {jugador.nombres.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{jugador.nombres} {jugador.apellidos}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{jugador.id.split('-')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 md:px-6">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${jugador.rol === 'Entrenador' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{jugador.rol}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{jugador.grupos || 'Sin grupo'}</p>
                  </td>
                  <td className="p-4 md:px-6 text-slate-600 dark:text-slate-300 font-medium">{jugador.telefono || '---'}</td>
                  <td className="p-4 md:px-6 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${jugador.estado_miembro === 'Inactivo' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>
                      {jugador.estado_miembro || 'Activo'}
                    </span>
                  </td>
                  <td className="p-4 md:px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setMiembroAgestionar(jugador); setEmailAcceso(jugador.email || ''); setIsModalAccesoOpen(true); }}
                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/20 rounded-lg transition-all"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      {pestaña === 'Registrados' ? (
                        <button onClick={() => router.push(`/director/miembros/${jugador.id}`)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-2"><ExternalLink className="w-5 h-5" /></button>
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
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INVITACIÓN (CÓDIGO DE REGISTRO) */}
      {isModalInvitacionOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Invitar a un Miembro</h3>
              <p className="text-slate-500 text-sm font-medium mt-3 px-6">Envía este enlace a los padres o nuevos miembros para que se registren por su cuenta.</p>
              
              <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Link de Registro Exclusivo</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 truncate overflow-hidden">
                    {typeof window !== 'undefined' ? `${window.location.origin}/registro?invite=true` : ''}
                  </div>
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/registro?invite=true`;
                      navigator.clipboard.writeText(link);
                      toast.success("¡Enlace copiado al portapapeles!");
                    }}
                    className="p-4 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Download className="w-5 h-5" style={{transform: 'rotate(270deg)'}} />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const mensaje = `¡Hola! Bienvenido a la academia 👋. Para unirte a nuestra plataforma oficial, regístrate en el siguiente enlace:\n\n🔗 ${window.location.origin}/registro?invite=true`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
                  }}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-5 h-5" /> Compartir en WhatsApp
                </button>
                <button 
                  onClick={() => setIsModalInvitacionOpen(false)}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
