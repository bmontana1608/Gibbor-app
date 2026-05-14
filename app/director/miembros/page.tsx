"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Download, UserPlus, Search, ChevronDown, Check, X, User, Key, Mail, ShieldCheck, Smartphone, ExternalLink, Eye, HeartPulse, Calendar, MapPin, CreditCard, Activity, FileText, Cake, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';

export default function DirectorioMiembros() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { slug: tenantSlug } = useTenant();
  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('Todos');
  const [filtroEdad, setFiltroEdad] = useState('Todas');
  const [cargando, setCargando] = useState(true);
  const [pestaña, setPestaña] = useState<'Registrados' | 'Pendientes' | 'Cumpleaños'>('Registrados');

  // Modales
  const [isModalInvitacionOpen, setIsModalInvitacionOpen] = useState(false);
  const [isModalDetallesOpen, setIsModalDetallesOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [emailAcceso, setEmailAcceso] = useState('');
  const [generandoAcceso, setGenerandoAcceso] = useState(false);

  useEffect(() => {
    async function init() {
      setCargando(true);
      
      // 1. Obtener Tenant del URL context (vía API)
      if (!tenantSlug) return;
      
      const resTenant = await fetch(`/api/tenant?slug=${tenantSlug}`);
      const tenantData = await resTenant.json();
      console.log("DEBUG MCM: Tenant detectado:", tenantData?.config?.nombre, "ID:", tenantData?.id);
      setTenant(tenantData);

      // 2. Obtener Sesión y Perfil del Usuario
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      console.log("DEBUG MCM: Mi perfil:", perfil?.nombres, "Club ID:", perfil?.club_id);
      setUserProfile(perfil);

      // 3. VALIDACIÓN DE SEGURIDAD: ¿Tiene permiso sobre este club?
      const isSuperAdmin = perfil?.rol === 'SuperAdmin';
      const belongsToClub = perfil?.club_id === tenantData.id;

      if (!isSuperAdmin && !belongsToClub) {
        console.error("DEBUG MCM: Permiso denegado. Perfil Club:", perfil?.club_id, "Tenant ID:", tenantData.id);
        toast.error("No tienes permiso para acceder a este club.");
        // Redirigir a su propio club si existe
        if (perfil?.club_id) {
          const { data: c } = await supabase.from('clubes').select('slug').eq('id', perfil.club_id).single();
          if (c) router.push(`/${c.slug}/director`);
        } else {
          router.push('/login');
        }
        return;
      }

      // 4. Cargar datos filtrados
      if (tenantData.id) {
        cargarJugadores(tenantData.id);
      }
    }
    init();
  }, [tenantSlug]);

  const cargarJugadores = async (clubId?: any) => {
    const targetId = (typeof clubId === 'string' ? clubId : null) || tenant?.id;
    if (!targetId) return;

    setCargando(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('club_id', targetId) // FILTRO CRÍTICO DE AISLAMIENTO
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

  const calcularEdad = (fecha: string) => {
    if (!fecha) return '---';
    try {
      let birthDate: Date;
      if (fecha.includes('/')) {
        const [d, m, y] = fecha.split('/').map(Number);
        birthDate = new Date(y, m - 1, d);
      } else {
        birthDate = new Date(fecha);
      }
      const hoy = new Date();
      let edad = hoy.getFullYear() - birthDate.getFullYear();
      const mes = hoy.getMonth() - birthDate.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < birthDate.getDate())) edad--;
      return edad >= 0 ? edad : '---';
    } catch (e) { return '---'; }
  };

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
            password: 'Club2026*', 
            rol: miembro.rol || 'Futbolista', 
            perfilId: miembro.id 
          })
        });
        
        if (res.ok) {
          toast.success(`${miembro.nombres} ya puede ingresar con su correo y clave: Club2026*`, { id: toastId, duration: 6000 });
        } else {
          toast.warning(`${miembro.nombres} aprobado, pero el acceso debe crearse manualmente (posible correo duplicado).`, { id: toastId });
        }
      } catch (err) {
        toast.warning(`${miembro.nombres} aprobado, pero hubo un error creando el acceso.`, { id: toastId });
      }
    } else {
      toast.success(`${miembro.nombres} aprobado (Sin correo para crear acceso).`, { id: toastId });
    }
    
    cargarJugadores(tenant.id);
  };

  const rechazarJugador = async (id: string, nombreCompleto: string) => {
    if (!window.confirm(`¿Seguro que deseas rechazar la solicitud de ${nombreCompleto}?`)) return;
    const toastId = toast.loading(`Procesando...`);
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (!error) {
       toast.success("Solicitud rechazada correctamente.", { id: toastId });
       cargarJugadores(tenant?.id);
    } else {
       toast.error("Error al procesar el rechazo.", { id: toastId });
    }
  };

  const jugadoresFiltrados = jugadores.filter(jugador => {
    const estado = jugador.estado_miembro || '';
    
    // Filtro por pestaña
    let cumplePestaña = false;
    if (pestaña === 'Registrados') {
      cumplePestaña = estado === 'Activo' || estado === 'Inactivo';
    } else if (pestaña === 'Pendientes') {
      cumplePestaña = estado !== 'Activo' && estado !== 'Inactivo';
    } else if (pestaña === 'Cumpleaños') {
      if (!jugador.fecha_nacimiento) return false;
      
      const mesActual = new Date().getMonth() + 1;
      let mesNac = 0;

      // Intentar parsear fecha manual si viene en formato D/M/YYYY o similar
      if (jugador.fecha_nacimiento.includes('/')) {
        const partes = jugador.fecha_nacimiento.split('/');
        // Si tiene 3 partes, el mes suele ser la segunda (D/M/Y)
        mesNac = parseInt(partes[1]);
      } else {
        // Formato ISO estándar YYYY-MM-DD
        mesNac = new Date(jugador.fecha_nacimiento).getUTCMonth() + 1;
      }
      
      cumplePestaña = (estado === 'Activo') && (mesActual === mesNac);
    }

    const coincideBusqueda = (jugador.nombres + ' ' + jugador.apellidos).toLowerCase().includes(busqueda.toLowerCase()) || (jugador.documento_identidad || '').includes(busqueda);
    const coincideGrupo = filtroGrupo === 'Todos' || jugador.grupos === filtroGrupo;
    const coincideEdad = filtroEdad === 'Todas' || calcularEdad(jugador.fecha_nacimiento).toString() === filtroEdad;
    
    return cumplePestaña && coincideBusqueda && coincideGrupo && coincideEdad;
  });

  const gruposDisponibles = ['Todos', ...Array.from(new Set(jugadores.map(j => j.grupos).filter(Boolean)))];
  const edadesDisponibles = ['Todas', ...Array.from(new Set(jugadores.map(j => calcularEdad(j.fecha_nacimiento).toString()))).filter(e => e !== '---').sort((a, b) => parseInt(a) - parseInt(b))];

  const exportarAExcel = () => {
    if (jugadoresFiltrados.length === 0) return toast.error("No hay datos");
    const cabeceras = [
      'Nombres', 'Apellidos', 'Documento', 'Edad', 'Fecha Nacimiento', 
      'Rol', 'Categoria', 'Telefono', 'Email', 'Direccion',
      'Tipo Sangre', 'EPS', 'Talla Uniforme', 'Patologias',
      'Acudiente Nombre', 'Acudiente Identificacion', 'Emergencia Nombre', 'Emergencia Telefono',
      'Posicion', 'Dorsal', 'Plan', 'Estado Pago', 'Estado Miembro'
    ];
    
    const filas = jugadoresFiltrados.map(j => [
      `"${j.nombres || ''}"`, 
      `"${j.apellidos || ''}"`, 
      `"${j.documento_identidad || ''}"`, 
      `"${calcularEdad(j.fecha_nacimiento)}"`, 
      `"${j.fecha_nacimiento || ''}"`, 
      `"${j.rol || ''}"`, 
      `"${j.grupos || '---'}"`, 
      `"${j.telefono || ''}"`,
      `"${j.email_contacto || j.email || ''}"`,
      `"${j.direccion || ''}"`,
      `"${j.tipo_sangre || ''}"`,
      `"${j.eps || ''}"`,
      `"${j.talla_uniforme || ''}"`,
      `"${j.patologias || ''}"`,
      `"${j.acudiente_nombre || ''}"`,
      `"${j.acudiente_identificacion || ''}"`,
      `"${j.emergencia_nombre || ''}"`,
      `"${j.emergencia_telefono || ''}"`,
      `"${j.posicion || ''}"`,
      `"${j.dorsal || ''}"`,
      `"${j.tipo_plan || ''}"`,
      `"${j.estado_pago || ''}"`,
      `"${j.estado_miembro || ''}"`
    ]);

    const contenidoCSV = [cabeceras.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tenant?.config?.nombre || 'Club'}_Directorio_Completo.csv`);
    link.click();
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Cargando miembros...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 font-sans text-slate-800 dark:text-slate-100 relative transition-colors">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="text-brand w-8 h-8" /> Gestión de Miembros
          </h1>
          <p className="text-slate-500 text-sm mt-1">Control administrativo de deportistas y entrenadores.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cargarJugadores} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-all shadow-sm" title="Refrescar datos">
            <Activity className={`w-4 h-4 text-brand ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsModalInvitacionOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-bold text-sm shadow-xl shadow-slate-900/10"><UserPlus className="w-4 h-4" /> Invitar</button>
          <button onClick={exportarAExcel} className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"><Download className="w-4 h-4" /> Exportar</button>
        </div>
      </div>


      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto">
            <button onClick={() => setPestaña('Registrados')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pestaña === 'Registrados' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500'}`}>Miembros</button>
            <button onClick={() => setPestaña('Pendientes')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative ${pestaña === 'Pendientes' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500'}`}>
              Solicitudes
              {jugadores.filter(j => (j.estado_miembro || '') !== 'Activo' && (j.estado_miembro || '') !== 'Inactivo').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-white dark:border-slate-700">
                  {jugadores.filter(j => (j.estado_miembro || '') !== 'Activo' && (j.estado_miembro || '') !== 'Inactivo').length}
                </span>
              )}
            </button>
            <button onClick={() => setPestaña('Cumpleaños')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${pestaña === 'Cumpleaños' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500'}`}>
              <Cake className="w-3.5 h-3.5" />
              Cumpleaños
              {jugadores.filter(j => {
                if (!j.fecha_nacimiento || j.estado_miembro !== 'Activo') return false;
                return (new Date(j.fecha_nacimiento).getUTCMonth() + 1) === (new Date().getMonth() + 1);
              }).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-brand text-white text-[9px] font-black rounded-md">
                  {jugadores.filter(j => {
                    if (!j.fecha_nacimiento || j.estado_miembro !== 'Activo') return false;
                    return (new Date(j.fecha_nacimiento).getUTCMonth() + 1) === (new Date().getMonth() + 1);
                  }).length}
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto flex-1 lg:justify-end">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand text-sm transition-all" />
            </div>
            <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand font-medium">
              {gruposDisponibles.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filtroEdad} onChange={(e) => setFiltroEdad(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand font-medium">
              <option value="Todas">Edad: Todas</option>
              {edadesDisponibles.filter(e => e !== 'Todas').map(e => <option key={e} value={e}>{e} años</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {pestaña === 'Cumpleaños' ? (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jugadoresFiltrados.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cake className="text-slate-300 w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-bold">No hay cumpleaños este mes</p>
                </div>
              ) : (
                jugadoresFiltrados.map((jugador) => {
                  let dia = 0;
                  let nombreMes = '';
                  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

                  if (jugador.fecha_nacimiento.includes('/')) {
                    const partes = jugador.fecha_nacimiento.split('/');
                    dia = parseInt(partes[0]);
                    nombreMes = meses[parseInt(partes[1]) - 1];
                  } else {
                    const fecha = new Date(jugador.fecha_nacimiento);
                    dia = fecha.getUTCDate();
                    nombreMes = meses[fecha.getUTCMonth()];
                  }
                  
                  return (
                    <div key={jugador.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:shadow-xl hover:-[var(--brand-primary)]/5 transition-all duration-500">
                      <div className="absolute -top-4 -right-4 w-20 h-20 -[var(--brand-primary)]/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 text-xl">🎂</div>
                          <div>
                            <p className="text-[10px] font-black -[var(--brand-primary)] uppercase tracking-widest">{dia} de {nombreMes}</p>
                            <h4 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight">{jugador.nombres}</h4>
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Categoría</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200">{jugador.grupos || 'Sin grupo'}</p>
                        </div>

                        <button 
                          onClick={() => {
                            const msg = `¡Hola ${jugador.nombres}! 🎂⚽️ Desde el club te deseamos un muy feliz cumpleaños. ¡Que sigas creciendo con nosotros y que hoy sea un gran día de celebración! 🥳🎉`;
                            window.open(`https://wa.me/${jugador.telefono?.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all"
                        >
                          <Smartphone className="w-4 h-4" /> Felicitar por WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 md:px-6 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[140px] md:max-w-none truncate">Miembro</th>
                  <th className="p-4 md:px-6">Rol / Categoria</th>
                  <th className="p-4 md:px-6 hidden md:table-cell">Edad</th>
                  <th className="p-4 md:px-6 hidden md:table-cell">Contacto</th>
                  <th className="p-4 md:px-6 text-center">Estado</th>
                  <th className="p-4 md:px-6 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {cargando ? (
                  <tr><td colSpan={5} className="p-20 text-center"><div className="animate-spin w-8 h-8 border-4 -[var(--brand-primary)] border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-400 font-bold">Cargando...</p></td></tr>
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
                        <span className={`text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${jugador.rol === 'Entrenador' ? '-[rgba(var(--brand-primary-rgb),0.1)] dark:-[var(--brand-primary)]/20 -[var(--brand-primary)] dark:-[rgba(var(--brand-primary-rgb),0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{jugador.rol}</span>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate max-w-[80px] md:max-w-none">{jugador.grupos || 'Sin grupo'}</p>
                      </td>
                      <td className="p-4 md:px-6 text-slate-600 dark:text-slate-300 font-bold hidden md:table-cell">
                        {calcularEdad(jugador.fecha_nacimiento)}
                      </td>
                      <td className="p-4 md:px-6 text-slate-600 dark:text-slate-300 font-medium hidden md:table-cell">{jugador.telefono || '---'}</td>
                      <td className="p-4 md:px-6 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${jugador.estado_miembro === 'Inactivo' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>{jugador.estado_miembro === 'Inactivo' ? 'Inact' : 'Activo'}</span>
                      </td>
                      <td className="p-4 md:px-6 text-right">
                        <div className="flex justify-end gap-1 md:gap-2">
                          <button onClick={() => { 
                            setSolicitudSeleccionada(jugador); 
                            const emailSugerido = jugador.email_contacto || jugador.email || '';
                            setEmailAcceso(emailSugerido); 
                            setIsModalDetallesOpen(true); 
                          }} className="p-2 text-slate-400 hover:-[var(--brand-primary)] hover:-[rgba(var(--brand-primary-rgb),0.1)] dark:hover:-[var(--brand-primary)]/10 rounded-lg transition-all" title="Ver Ficha y Accesos"><Eye className="w-5 h-5" /></button>
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
          )}
        </div>
      </div>

      {/* MODAL DE INVITACIÓN */}
      {isModalInvitacionOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 text-center">
              <div className="w-20 h-20 -[rgba(var(--brand-primary-rgb),0.1)] dark:-[var(--brand-primary)]/10 rounded-3xl flex items-center justify-center mx-auto mb-6"><Mail className="w-10 h-10 -[var(--brand-primary)]" /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Invitar a un Miembro</h3>
              <p className="text-slate-500 text-sm font-medium mt-3 px-6">Envía este enlace a los padres para que se registren por su cuenta.</p>
              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Link de Registro</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/${tenant?.slug || 'club'}/unete?invite=true` : ''}
                  </div>
                  <button onClick={() => { 
                    const link = `${window.location.origin}/${tenant?.slug || 'club'}/unete?invite=true`;
                    navigator.clipboard.writeText(link); 
                    toast.success("Copiado!"); 
                  }} className="p-4 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 transition-all">
                    <Download className="w-5 h-5 rotate-270" />
                  </button>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => { 
                  const link = `${window.location.origin}/${tenant?.slug || 'club'}/unete?invite=true`;
                  const msg = `¡Hola! Únete a nuestra academia: ${link}`; 
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); 
                }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5" /> Compartir WhatsApp
                </button>
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
                <div className="w-14 h-14 -[var(--brand-primary)] rounded-2xl flex items-center justify-center shadow-lg -[var(--brand-primary)]/20"><User className="text-white w-7 h-7" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Ficha del Miembro</h3>
                  <p className="-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2"><span className="w-2 h-2 -[var(--brand-primary)] rounded-full animate-pulse"></span> {pestaña === 'Pendientes' ? 'Solicitud por Validar' : 'Activo en Plataforma'}</p>
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

              <div className="bg-slate-900 rounded-[2rem] p-6 text-white border-l-4 -[var(--brand-primary)] shadow-xl">
                <div className="flex items-center gap-4 mb-4"><ShieldCheck className="-[rgba(var(--brand-primary-rgb),0.4)] w-6 h-6" /><h4 className="text-sm font-black uppercase italic tracking-widest">Responsable</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nombre</p><p className="text-sm font-black">{solicitudSeleccionada.acudiente_nombre || 'No registrado'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ID</p><p className="text-sm font-black">{solicitudSeleccionada.acudiente_identificacion || 'N/A'}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><HeartPulse className="w-6 h-6 text-red-500 mx-auto mb-2" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sangre</p><p className="text-xl font-black text-slate-800 dark:text-white">{solicitudSeleccionada.tipo_sangre || 'N/A'}</p></div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">EPS</p><p className="text-sm font-black text-slate-800 dark:text-white truncate">{solicitudSeleccionada.eps || 'N/A'}</p></div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl text-center"><Download className="w-6 h-6 -[var(--brand-primary)] mx-auto mb-2 rotate-180" /><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Talla</p><p className="text-xl font-black text-slate-800 dark:text-white">{solicitudSeleccionada.talla_uniforme || 'N/A'}</p></div>
              </div>

              <div className={`p-6 rounded-[2rem] border-2 ${solicitudSeleccionada.patologias ? 'bg-red-50 border-red-100 dark:bg-red-950 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <h4 className="text-xs font-black uppercase tracking-widest mb-2">Notas Médicas / Alergias</h4>
                <p className="text-sm font-bold text-slate-500">{solicitudSeleccionada.patologias || 'Sin observaciones.'}</p>
              </div>

              {/* SECCIÓN DE EXPEDIENTE DIGITAL */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 -[rgba(var(--brand-primary-rgb),0.1)] dark:-[var(--brand-primary)]/20 rounded-xl flex items-center justify-center">
                    <FileText className="-[var(--brand-primary)] w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black uppercase italic tracking-widest">Expediente Digital</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {solicitudSeleccionada.doc_jugador_url ? (
                    <a href={solicitudSeleccionada.doc_jugador_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:-[var(--brand-primary)] transition-all group">
                      <FileText className="w-8 h-8 text-slate-400 group-hover:-[var(--brand-primary)] mb-2" />
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
                    <a href={solicitudSeleccionada.doc_eps_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:-[var(--brand-primary)] transition-all group">
                      <ShieldCheck className="w-8 h-8 text-slate-400 group-hover:-[var(--brand-primary)] mb-2" />
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
                    <a href={solicitudSeleccionada.doc_acudiente_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl hover:-[var(--brand-primary)] transition-all group">
                      <User className="w-8 h-8 text-slate-400 group-hover:-[var(--brand-primary)] mb-2" />
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
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 -[rgba(var(--brand-primary-rgb),0.1)] dark:-[var(--brand-primary)]/20 rounded-xl flex items-center justify-center"><Key className="-[var(--brand-primary)] w-5 h-5" /></div><h4 className="text-sm font-black uppercase italic tracking-widest">Accesos a Plataforma</h4></div>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
                  <input type="email" value={emailAcceso} onChange={(e) => setEmailAcceso(e.target.value)} placeholder="Correo electrónico" className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 font-bold outline-none focus:ring-2 focus:-[var(--brand-primary)]" />
                  <div className="flex flex-col gap-3">
                    {solicitudSeleccionada.email && pestaña === 'Registrados' ? (
                      <button onClick={async () => { 
                        if(!window.confirm("¿Seguro que deseas resetear la clave de este usuario?")) return; 
                        setGenerandoAcceso(true); 
                        const tid = toast.loading("Reseteando clave..."); 
                        const res = await fetch('/api/admin/reset-password', { 
                          method: 'POST', 
                          body: JSON.stringify({ userId: solicitudSeleccionada.id, newPassword: 'Club2026*' }) 
                        }); 
                        if(res.ok) toast.success("Clave reseteada a Club2026*", {id: tid});
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
                              password: 'Club2026*', 
                              rol: solicitudSeleccionada.rol || 'Futbolista', 
                              perfilId: solicitudSeleccionada.id 
                            }) 
                          }); 
                          const data = await res.json();
                          if(res.ok) { 
                            toast.success("¡Acceso activado correctamente!", { id: tid }); 
                            setIsModalDetallesOpen(false); 
                            cargarJugadores(tenant.id); 
                          } else { 
                            toast.error("Error: " + (data.error || "Fallo desconocido"), { id: tid }); 
                          }
                        } catch (err) {
                           toast.error("Error de conexión", { id: tid });
                        }
                        setGenerandoAcceso(false); 
                      }} disabled={generandoAcceso} className="w-full -[var(--brand-primary)] text-white py-4 rounded-2xl font-black uppercase text-[10px]">Activar Acceso</button>
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
