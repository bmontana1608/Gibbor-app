'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Users, Building2, TrendingUp, 
  Settings, LogOut, Plus, Search, Globe, CreditCard,
  X, Check, Loader2, ArrowRightLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoginForm from '@/components/LoginForm';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [vista, setVista] = useState<'clubes' | 'usuarios' | 'suscripciones' | 'metricas' | 'configuracion'>('clubes');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clubes, setClubes] = useState<any[]>([]);
  const [usuariosGlobales, setUsuariosGlobales] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [clubAudit, setClubAudit] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    logo_url: '',
    color_primario: '#06b6d4',
    correo_director: '',
    password_director: ''
  });

  // Cargar Usuarios Globales
  const cargarUsuarios = async () => {
    const { data } = await supabase.from('perfiles').select('*').limit(50);
    setUsuariosGlobales(data || []);
  };

  useEffect(() => {
    if (vista === 'usuarios') cargarUsuarios();
  }, [vista]);

  // Configuración del Tenant para el Login de SuperAdmin
  const adminTenant = {
    config: {
      nombre: 'Master Club Manager (MCM)',
      color: '#0891b2', // Cian corporativo
      logo: 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'
    }
  };

  // Cargar expedientes
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

  // Cargar datos consolidados
  const cargarTodo = async () => {
    setFetching(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsAdmin(false);
      setFetching(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const userRole = perfil?.rol?.toLowerCase();

    if (userRole !== 'superadmin') {
      setIsAdmin(false);
      setFetching(false);
      return;
    }

    setIsAdmin(true);

    // Cargar Clubes y Métricas
    const [resClubes, resMetrics] = await Promise.all([
      supabase.from('clubes').select('*').order('created_at', { ascending: false }),
      fetch('/api/admin/metrics').then(r => r.json())
    ]);

    if (resClubes.data) setClubes(resClubes.data);
    if (resMetrics) setMetrics(resMetrics);
    
    setFetching(false);
  };

  useEffect(() => {
    cargarTodo();

    // ESCUCHA DE SESIÓN: Si el usuario se loguea desde el formulario, cargamos todo automáticamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        cargarTodo();
      }
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isAdmin === false) {
    return <LoginForm tenant={adminTenant} />;
  }

  if (isAdmin === null || fetching) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const toggleEstadoClub = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
    const { error } = await supabase.from('clubes').update({ estado: nuevoEstado }).eq('id', id);
    
    if (error) {
      toast.error('Error al cambiar estado');
    } else {
      toast.success(`Club ${nuevoEstado}`);
      cargarTodo();
    }
  };


  const handleCrearClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/clubes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);
      
      setClubes([data, ...clubes]);
      setShowModal(false);
      setFormData({ nombre: '', slug: '', logo_url: '', color_primario: '#06b6d4', correo_director: '', password_director: '' });
      toast.success('¡Academia registrada con éxito!');
    } catch (err: any) {
      toast.error('Error de Seguridad: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans tracking-tight relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar Lateral */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-white/5 p-6 hidden md:flex flex-col z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40 rotate-3">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-base uppercase tracking-tighter italic leading-none text-white">MCM</h1>
            <p className="text-[9px] text-cyan-500/70 font-bold uppercase tracking-widest leading-none mt-1">Master Club Manager</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem icon={<Building2 size={18} />} label="Gestión de Clubes" active={vista === 'clubes'} onClick={() => setVista('clubes')} />
          <NavItem icon={<Users size={18} />} label="Usuarios Globales" active={vista === 'usuarios'} onClick={() => setVista('usuarios')} />
          <NavItem icon={<CreditCard size={18} />} label="Suscripciones" active={vista === 'suscripciones'} onClick={() => setVista('suscripciones')} />
          <NavItem icon={<TrendingUp size={18} />} label="Métricas Master" active={vista === 'metricas'} onClick={() => setVista('metricas')} />
        </nav>

        <div className="pt-6 border-t border-white/5 space-y-2">
          <NavItem icon={<Settings size={18} />} label="Configuración" active={vista === 'configuracion'} onClick={() => setVista('configuracion')} />
          <button 
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) {
                toast.error("Error al cerrar sesión");
              } else {
                toast.success("Sesión cerrada correctamente");
                setIsAdmin(false);
                router.refresh();
              }
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="md:ml-64 p-8 relative z-10">

        {/* Dashboard de Métricas Master (Solo se ve en vista 'clubes' o 'metricas') */}
        {(vista === 'clubes' || vista === 'metricas') && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
             <MetricCard 
                label="Ingreso SaaS Proyectado" 
                value={`$${metrics?.proyeccionIngresosSaaS?.toLocaleString('es-CO') || '0'}`} 
                icon={<TrendingUp className="text-emerald-400" />} 
                sub="Canon $2,000 / Niño / Mes" 
                color="emerald"
             />
             <MetricCard 
                label="Alumnos en Red" 
                value={metrics?.totalJugadores || '0'} 
                icon={<Users className="text-cyan-400" />} 
                sub="Deportistas activos" 
                color="cyan"
             />
             <MetricCard 
                label="Recaudo Histórico" 
                value={`$${metrics?.recaudoTotal?.toLocaleString('es-CO') || '0'}`} 
                icon={<CreditCard className="text-blue-400" />} 
                sub="Flujo total procesado" 
                color="blue"
             />
             <MetricCard 
                label="Ecosistema Activo" 
                value={`${metrics?.clubesActivos || 0} / ${metrics?.totalClubes || 0}`} 
                icon={<ShieldCheck className="text-purple-400" />} 
                sub="Academias en operación" 
                color="purple"
             />
          </section>
        )}

        {vista === 'metricas' && (
          <section className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Análisis Temprano de <span className="text-cyan-500">Crecimiento MCM</span></h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem]">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 border-b border-white/5 pb-4">Densidad de Jugadores por Academia</h4>
                      <div className="space-y-6">
                          {clubes.slice(0, 5).map(c => (
                            <div key={c.id}>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                    <span>{c.nombre}</span>
                                    <span className="text-cyan-500">{metrics?.alumnosPorClub?.[c.id] || 0} / 50</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                      className="h-full bg-cyan-600 rounded-full" 
                                      style={{ width: `${Math.min(((metrics?.alumnosPorClub?.[c.id] || 0) / 50) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] flex flex-col items-center justify-center text-center">
                      <TrendingUp className="text-emerald-500 mb-6" size={48} />
                      <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Tendencia de Expansión</h4>
                      <p className="text-slate-500 text-sm font-medium max-w-xs">El ecosistema ha crecido un 15% este mes. Se proyectan 3 nuevas aperturas para el próximo trimestre.</p>
                      <button className="mt-8 bg-white/5 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl border border-white/5 hover:border-cyan-500/50 transition-colors">Generar Reporte PDF</button>
                  </div>
              </div>
          </section>
        )}
        
        {vista === 'clubes' && (
          <>
            {/* Header Superior */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in duration-1000">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">MCM <span className="text-cyan-500">Command Center</span></h2>
                <p className="text-slate-500 text-sm font-medium">Control global del ecosistema Master Club Manager.</p>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-8 py-5 rounded-2xl flex items-center gap-3 transition-all shadow-2xl shadow-cyan-900/40 hover:-translate-y-1 active:scale-95 text-xs uppercase italic tracking-tighter"
              >
                <Plus size={20} strokeWidth={3} /> Desplegar Nueva Academia
              </button>
            </header>

            {/* Listado de Clubes */}
            <section className="bg-zinc-900/40 backdrop-blur-md rounded-[3rem] border border-white/5 p-10 shadow-2xl relative min-h-[400px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {fetching ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-6 bg-cyan-600 rounded-full" />
                        <h3 className="font-black uppercase italic tracking-tighter text-2xl">Academias Conectadas</h3>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-6 py-2 rounded-full border border-white/5">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> {clubes.length} Nodos</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="pb-6 px-4">Directorio / Club</th>
                          <th className="pb-6 px-4 text-center">Población</th>
                          <th className="pb-6 px-4">Canon SaaS</th>
                          <th className="pb-6 px-4">Estado Red</th>
                          <th className="pb-6 px-4 text-right">Controles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {clubes.map((club) => (
                          <ClubRow 
                            key={club.id} 
                            club={club} 
                            count={metrics?.alumnosPorClub?.[club.id] || 0}
                            onToggle={toggleEstadoClub} 
                            onAudit={auditClub}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {vista === 'usuarios' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">Auditoría de <span className="text-cyan-500">Usuarios Globales</span></h2>
                  <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500 transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre o rol..."
                        className="bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-cyan-500/50 transition-all w-full md:w-80 font-bold text-sm"
                        onChange={(e) => {
                          const term = e.target.value.toLowerCase();
                          const filtered = usuariosGlobales.filter(u => 
                            u.nombres?.toLowerCase().includes(term) || 
                            u.apellidos?.toLowerCase().includes(term) ||
                            u.rol?.toLowerCase().includes(term)
                          );
                          // En un entorno real esto sería una llamada API, aquí filtramos la carga inicial
                        }}
                      />
                  </div>
              </div>

              <div className="bg-zinc-900/40 backdrop-blur-md rounded-[3rem] border border-white/5 p-10 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                          <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                              <th className="pb-6 px-4">Usuario</th>
                              <th className="pb-6 px-4">Rol en Red</th>
                              <th className="pb-6 px-4">Registro en</th>
                              <th className="pb-6 px-4">Estado</th>
                              <th className="pb-6 px-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {usuariosGlobales.map(u => (
                              <tr key={u.id} className="group hover:bg-white/[0.02] transition-all">
                                  <td className="py-4 px-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-500 font-black text-[10px]">
                                              {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="font-bold text-sm uppercase italic text-white leading-none">{u.nombres} {u.apellidos}</p>
                                              <p className="text-[9px] text-slate-500 font-mono mt-1">{u.id.substring(0,12)}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="py-4 px-4 font-black text-xs text-cyan-500 uppercase tracking-tight">{u.rol}</td>
                                  <td className="py-4 px-4 text-xs text-slate-400 capitalize flex items-center gap-2">
                                      <Building2 size={12} className="text-slate-600" />
                                      ID: {u.club_id?.substring(0,8)}...
                                  </td>
                                  <td className="py-4 px-4">
                                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-emerald-500/20">Verificado</span>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Detalles</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
              </div>
          </section>
        )}

        {vista === 'suscripciones' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">Gestión de <span className="text-emerald-500">Suscripciones & Pagos</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recaudo Estimado (Mes)</p>
                      <p className="text-3xl font-black text-white italic tracking-tighter">${(metrics?.totalJugadores * 2000)?.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pasarela Activa</p>
                      <p className="text-xl font-black text-cyan-500 uppercase italic tracking-tighter">Wompi / Bold / Culqi</p>
                  </div>
                  <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tasa de Mora Global</p>
                      <p className="text-3xl font-black text-red-500 italic tracking-tighter">12.4%</p>
                  </div>
              </div>

              <div className="bg-zinc-900/40 backdrop-blur-md rounded-[3rem] border border-white/5 p-10 shadow-2xl">
                  <h3 className="font-black uppercase italic tracking-tighter text-xl mb-6 flex items-center gap-2">
                      <CreditCard className="text-emerald-500" size={20} /> Historial de Transacciones Master
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="pb-6 px-4">Club Nodo</th>
                          <th className="pb-6 px-4">Referencia</th>
                          <th className="pb-6 px-4">Fecha</th>
                          <th className="pb-6 px-4">Monto Bruto</th>
                          <th className="pb-6 px-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-all">
                          <td className="py-4 px-4 font-bold text-sm uppercase italic">EFD GIBBOR FC</td>
                          <td className="py-4 px-4 text-[10px] font-mono text-slate-500">MCM-PAY-88219</td>
                          <td className="py-4 px-4 text-xs text-slate-400">Hoy, 10:45 AM</td>
                          <td className="py-4 px-4 font-black text-sm text-emerald-500 italic">$450,200</td>
                          <td className="py-4 px-4"><span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-emerald-500/20">Éxito</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
              </div>
          </section>
        )}

        {vista === 'configuracion' && (
          <section className="max-w-4xl py-10 space-y-12 animate-in fade-in duration-700">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2">AJUSTES <span className="text-cyan-500">MAESTROS</span></h2>
                <p className="text-slate-500 text-sm font-medium">Configuración de núcleo de la plataforma Master Club Manager.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Sistema & Seguridad</h3>
                      <div className="p-6 bg-zinc-900 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                          <div>
                              <p className="font-bold uppercase tracking-tight text-white mb-1">Modo de Mantenimiento</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black">Suspender acceso a todos los clubes</p>
                          </div>
                          <div className="w-12 h-6 bg-zinc-800 rounded-full border border-white/5 relative cursor-pointer">
                              <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-600 rounded-full"></div>
                          </div>
                      </div>
                      <div className="p-6 bg-zinc-900 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                          <div>
                              <p className="font-bold uppercase tracking-tight text-white mb-1">Registro de Nuevos Clubes</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black">Permitir onboarding desde Landing</p>
                          </div>
                          <div className="w-12 h-6 bg-cyan-600 rounded-full border border-cyan-500 relative cursor-pointer">
                              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg"></div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Identidad de Marca (White-label)</h3>
                      <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logo Principal SaaS</p>
                             <button className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Cambiar</button>
                          </div>
                          <div className="w-full h-32 bg-zinc-950 rounded-2xl border border-white/5 flex items-center justify-center border-dashed">
                              <ShieldCheck className="text-zinc-800 w-12 h-12" />
                          </div>
                      </div>
                  </div>
              </div>
          </section>
        )}
      </main>

      {/* MODAL DETALLES CLUB */}
      {selectedClub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-end animate-in slide-in-from-right duration-300">
           <div className="bg-zinc-900 w-full max-w-2xl h-full border-l border-white/10 p-10 flex flex-col shadow-2xl relative overflow-y-auto">
              <button 
                onClick={() => { setSelectedClub(null); setClubAudit(null); }} 
                className="absolute top-8 right-8 text-slate-500 hover:text-white bg-white/5 p-2 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-6 mb-10 mt-4">
                 <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] border border-white/10 p-4 flex items-center justify-center overflow-hidden">
                    <img src={selectedClub.logo_url} className="w-full h-full object-contain" />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedClub.nombre}</h3>
                    <p className="text-cyan-500 font-mono text-sm tracking-widest">/{selectedClub.slug}</p>
                 </div>
              </div>

              {detailsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                </div>
              ) : clubAudit && (
                <div className="space-y-10">
                   {/* Mini Dashboard del Club */}
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Entrenadores</p>
                         <p className="text-3xl font-black text-white italic tracking-tighter">{clubAudit.stats?.coaches || 0}</p>
                      </div>
                      <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categorías</p>
                         <p className="text-3xl font-black text-white italic tracking-tighter">{clubAudit.stats?.categorias || 0}</p>
                      </div>
                   </div>

                   {/* Actividad Reciente */}
                   <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6 border-b border-white/5 pb-4">Actividad Financiera Reciente</h4>
                      <div className="space-y-4">
                         {clubAudit.actividad?.length > 0 ? clubAudit.actividad.map((pago: any) => (
                           <div key={pago.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                              <div>
                                 <p className="text-sm font-bold text-white uppercase tracking-tighter">{pago.jugador_nombre || 'Alumno Sin Nombre'}</p>
                                 <p className="text-[10px] text-slate-500 font-medium">{new Date(pago.fecha).toLocaleDateString()}</p>
                              </div>
                              <p className="text-sm font-black text-emerald-500 italic tracking-tighter">+ ${parseFloat(pago.total).toLocaleString('es-CO')}</p>
                           </div>
                         )) : (
                           <p className="text-sm text-slate-500 italic">No hay pagos registrados recientemente.</p>
                         )}
                      </div>
                   </div>

                   {/* Acciones Maestras */}
                   <div className="pt-10 border-t border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-cyan-500 mb-6">Zona de Peligro</h4>
                      <div className="flex flex-wrap gap-4">
                         <button 
                           onClick={() => toggleEstadoClub(selectedClub.id, selectedClub.estado)}
                           className={`flex-1 font-black uppercase italic tracking-tighter text-xs py-4 px-6 rounded-2xl transition-all ${selectedClub.estado === 'Activo' ? 'bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
                         >
                           {selectedClub.estado === 'Activo' ? 'Suspender Academia' : 'Reactivar Academia'}
                         </button>
                         <Link 
                           href={`/${selectedClub.slug}/director`}
                           className="flex-1 bg-white/5 text-slate-400 font-black uppercase italic tracking-tighter text-xs py-4 px-6 rounded-2xl border border-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                         >
                           <ArrowRightLeft size={14} /> Ver como Director
                         </Link>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* MODAL CREAR CLUB */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-[3rem] w-full max-w-xl p-10 relative shadow-[0_0_100px_-20px_rgba(8,145,178,0.15)]">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3">
              <Building2 className="text-cyan-500" /> Registrar <span className="text-cyan-500">Nueva Academia</span>
            </h3>

            <form onSubmit={handleCrearClub} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Oficial</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} type="text" placeholder="Ej: Eagles Football Academy" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-cyan-500/50 outline-none transition-all font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Subdominio (Slug)</label>
                  <input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})} type="text" placeholder="eagles-fc" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-cyan-500/50 outline-none transition-all font-mono text-sm text-cyan-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color de Marca</label>
                  <input value={formData.color_primario} onChange={e => setFormData({...formData, color_primario: e.target.value})} type="color" className="w-full bg-zinc-950 border border-white/10 rounded-2xl h-[54px] p-2 cursor-pointer" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">URL Logo (Imagen)</label>
                  <input required value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} type="url" placeholder="https://..." className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-cyan-500/50 outline-none transition-all font-bold text-sm" />
                </div>
                
                <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                  <h4 className="text-xs font-black text-cyan-500 uppercase tracking-widest mb-4">Credenciales del Administrador (Dueño)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                      <input required value={formData.correo_director} onChange={e => setFormData({...formData, correo_director: e.target.value})} type="email" placeholder="admin@escuela.com" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-cyan-500/50 outline-none transition-all font-bold text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Contraseña Temporal</label>
                      <input required value={formData.password_director} onChange={e => setFormData({...formData, password_director: e.target.value})} type="text" placeholder="Pass1234!" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-cyan-500/50 outline-none transition-all font-mono text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-cyan-900/20 active:scale-95 transition-all text-sm uppercase italic tracking-tighter">
                  {loading ? <Loader2 className="animate-spin" /> : <><Check /> Confirmar Registro</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Componentes Auxiliares
function NavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest leading-none">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, icon, sub, color = "cyan" }: any) {
  const colorMap: any = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-500",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-500",
  };

  return (
    <div className={`relative bg-zinc-900 border ${colorMap[color].split(' ')[2]} p-8 rounded-[2.5rem] hover:scale-[1.02] transition-all group overflow-hidden shadow-2xl`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]} blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
          {icon}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5`}>Live</div>
      </div>
      
      <div className="relative z-10">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</h4>
        <p className="text-3xl font-black text-white italic tracking-tighter mb-2">{value}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 inline-block px-2 py-0.5 rounded-md">{sub}</p>
      </div>
    </div>
  );
}

function ClubRow({ club, count, onToggle, onAudit }: any) {
  const [host, setHost] = useState('');
  
  useEffect(() => {
    setHost(window.location.host);
  }, []);

  const getClubUrl = () => {
    if (!host) return '#';
    if (host.includes('localhost')) return `http://localhost:3000/${club.slug}/director`;
    return `https://${host}/${club.slug}/director`;
  };

  const canonMensual = count * 2000;

  return (
    <tr className="group hover:bg-white/[0.02] transition-all">
      <td className="py-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/10 p-2 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-orange-500/50 transition-colors">
             <img src={club.logo_url} className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-black text-sm text-white uppercase italic tracking-tighter">{club.nombre}</p>
            <a href={getClubUrl()} target="_blank" className="text-[10px] font-bold text-orange-500/50 hover:text-orange-500 transition-colors uppercase tracking-widest flex items-center gap-1">
              <Globe size={10} /> <span>/{club.slug}</span>
            </a>
          </div>
        </div>
      </td>
      <td className="py-6 px-4 text-center">
        <div className="inline-flex flex-col">
          <span className="text-lg font-black text-white italic leading-none">{count}</span>
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Atletas</span>
        </div>
      </td>
      <td className="py-6 px-4">
        <div className="flex flex-col">
          <span className="text-lg font-black text-emerald-400 italic leading-none">
            ${canonMensual.toLocaleString('es-CO')}
          </span>
          <span className="text-[8px] text-slate-600 uppercase font-black tracking-widest">Facturación / Mes</span>
        </div>
      </td>
      <td className="py-6 px-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border ${
          club.estado === 'Activo' 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
          {club.estado}
        </span>
      </td>
      <td className="py-6 px-4 text-right">
        <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onToggle(club.id, club.estado)}
            className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${
              club.estado === 'Activo' 
                ? 'text-red-400 border-red-500/20 hover:bg-red-500/10' 
                : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
            }`}
          >
            {club.estado === 'Activo' ? 'Suspender' : 'Reactivar'}
          </button>
          <button 
            onClick={() => onAudit(club)}
            className="text-[9px] font-black uppercase tracking-widest text-white px-4 py-2 bg-white/5 border border-white/5 rounded-xl hover:bg-cyan-600 hover:border-cyan-500 transition-all shadow-xl"
          >
            Detalles
          </button>
        </div>
      </td>
    </tr>
  );
}
