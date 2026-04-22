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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clubes, setClubes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [clubAudit, setClubAudit] = useState<any>(null);

  // Configuración del Tenant para el Login de SuperAdmin
  const adminTenant = {
    config: {
      nombre: 'NexClub SaaS Management',
      color: '#EA580C',
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
  }, [router]);

  if (isAdmin === false) {
    return <LoginForm tenant={adminTenant} />;
  }

  if (isAdmin === null || fetching) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
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

  // Manejar creación de club
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    logo_url: '',
    color_primario: '#ea580c',
    correo_director: '',
    password_director: ''
  });

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
      setFormData({ nombre: '', slug: '', logo_url: '', color_primario: '#ea580c', correo_director: '', password_director: '' });
      toast.success('¡Academia registrada con éxito!');
    } catch (err: any) {
      toast.error('Error de Seguridad: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 font-sans tracking-tight">
      
      {/* Sidebar Lateral */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-white/5 p-6 hidden md:block">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-sm uppercase tracking-tighter italic">SaaS Master</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gibbor Cloud v1.0</p>
          </div>
        </div>

        <nav className="space-y-2">
          <NavItem icon={<Building2 size={18} />} label="Gestión de Clubes" active />
          <NavItem icon={<Users size={18} />} label="Usuarios Globales" />
          <NavItem icon={<CreditCard size={18} />} label="Suscripciones" />
          <NavItem icon={<TrendingUp size={18} />} label="Métricas Master" />
          <div className="pt-10">
            <NavItem icon={<Settings size={18} />} label="Configuración" />
            <NavItem icon={<LogOut size={18} />} label="Cerrar Sesión" />
          </div>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="md:ml-64 p-8">

        {/* Dashboard de Métricas Master */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           <MetricCard 
              label="Ingreso SaaS Proyectado" 
              value={`$${metrics?.proyeccionIngresosSaaS?.toLocaleString('es-CO') || '0'}`} 
              icon={<TrendingUp className="text-emerald-500" />} 
              sub="Basado en $2,000/niño" 
           />
           <MetricCard 
              label="Alumnos Globales" 
              value={metrics?.totalJugadores || '0'} 
              icon={<Users className="text-orange-500" />} 
              sub="Total de deportistas en red" 
           />
           <MetricCard 
              label="Recaudo Academias" 
              value={`$${metrics?.recaudoTotal?.toLocaleString('es-CO') || '0'}`} 
              icon={<CreditCard className="text-blue-500" />} 
              sub="Flujo total procesado este mes" 
           />
           <MetricCard 
              label="Clubes Activos" 
              value={`${metrics?.clubesActivos || 0} / ${metrics?.totalClubes || 0}`} 
              icon={<ShieldCheck className="text-purple-500" />} 
              sub="Tasa de operación SaaS" 
           />
        </section>
        
        {/* Header Superior */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Panel Maestro <span className="text-orange-500">Multiclub</span></h2>
            <p className="text-slate-500 text-sm font-medium">Gestiona el ecosistema de academias deportivas desde un solo lugar.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-orange-900/20 active:scale-95 text-sm uppercase italic tracking-tighter"
          >
            <Plus size={20} strokeWidth={3} /> Nuevo Club
          </button>
        </header>

        {/* Listado de Clubes */}
        <section className="bg-zinc-900 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative min-h-[400px]">
          {fetching ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black uppercase italic tracking-tighter text-xl">Directorio de Academias</h3>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {clubes.length} Clubes Registrados</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4 px-4">Club</th>
                      <th className="pb-4 px-4 text-center">Alumnos</th>
                      <th className="pb-4 px-4">Canon SaaS (Mes)</th>
                      <th className="pb-4 px-4">Estado</th>
                      <th className="pb-4 px-4 text-right">Acciones</th>
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
                    <p className="text-orange-500 font-mono text-sm tracking-widest">/{selectedClub.slug}</p>
                 </div>
              </div>

              {detailsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
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
                      <h4 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-6">Zona de Peligro</h4>
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
          <div className="bg-zinc-900 border border-white/10 rounded-[3rem] w-full max-w-xl p-10 relative shadow-[0_0_100px_-20px_rgba(234,88,12,0.15)]">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3">
              <Building2 className="text-orange-500" /> Registrar <span className="text-orange-500">Nueva Academia</span>
            </h3>

            <form onSubmit={handleCrearClub} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Oficial</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} type="text" placeholder="Ej: Eagles Football Academy" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Subdominio (Slug)</label>
                  <input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})} type="text" placeholder="eagles-fc" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-mono text-sm text-orange-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color de Marca</label>
                  <input value={formData.color_primario} onChange={e => setFormData({...formData, color_primario: e.target.value})} type="color" className="w-full bg-zinc-950 border border-white/10 rounded-2xl h-[54px] p-2 cursor-pointer" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">URL Logo (Imagen)</label>
                  <input required value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} type="url" placeholder="https://..." className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-bold text-sm" />
                </div>
                
                <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                  <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4">Credenciales del Administrador (Dueño)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                      <input required value={formData.correo_director} onChange={e => setFormData({...formData, correo_director: e.target.value})} type="email" placeholder="admin@escuela.com" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-bold text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Contraseña Temporal</label>
                      <input required value={formData.password_director} onChange={e => setFormData({...formData, password_director: e.target.value})} type="text" placeholder="Pass1234!" className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-mono text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-orange-900/20 active:scale-95 transition-all text-sm uppercase italic tracking-tighter">
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
function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest leading-none">{label}</span>
    </div>
  );
}

function ClubRow({ club, count, onToggle, onAudit }: any) {
  const [host, setHost] = useState('');
  
  useEffect(() => {
    setHost(window.location.host);
  }, []);

  // Generar la URL del club
  const getClubUrl = () => {
    if (!host) return '#';
    if (host.includes('localhost')) return `http://localhost:3000/${club.slug}/director`;
    return `https://${host}/${club.slug}/director`;
  };

  const canonMensual = count * 2000;

  return (
    <tr className="group hover:bg-white/5 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/5 p-1 flex items-center justify-center overflow-hidden">
             <img src={club.logo_url} className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">{club.nombre}</p>
            <a href={getClubUrl()} target="_blank" className="text-[9px] font-mono text-orange-500/50 hover:text-orange-500 transition-colors uppercase tracking-widest">/{club.slug}</a>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded-md border border-white/5">{count}</span>
      </td>
      <td className="py-4 px-4">
        <span className="text-xs font-black text-emerald-500 tracking-tighter">
          ${canonMensual.toLocaleString('es-CO')}
        </span>
        <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">COP / Mes</p>
      </td>
      <td className="py-4 px-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${club.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {club.estado}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={() => onToggle(club.id, club.estado)}
            className={`text-[10px] font-black uppercase tracking-widest p-2 rounded-lg transition-colors ${club.estado === 'Activo' ? 'text-red-400 hover:bg-red-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
          >
            {club.estado === 'Activo' ? 'Suspender' : 'Activar'}
          </button>
          <button 
            onClick={() => onAudit(club)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white p-2 border border-white/5 rounded-lg hover:bg-white/5 transition-all"
          >
            Expediente
          </button>
        </div>
      </td>
    </tr>
  );
}

function MetricCard({ label, value, icon, sub }: any) {
  return (
    <div className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem] hover:border-orange-500/20 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <TrendingUp className="text-white/5" size={20} />
      </div>
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</h4>
      <p className="text-2xl font-black text-white italic tracking-tighter mb-1">{value}</p>
      <p className="text-[10px] text-slate-600 font-medium">{sub}</p>
    </div>
  );
}
