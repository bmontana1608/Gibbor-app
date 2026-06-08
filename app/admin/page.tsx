'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Users, Building2, TrendingUp, 
  Settings, LogOut, Plus, Globe, CreditCard,
  X, Check, Loader2, ArrowRightLeft, Trash2, History, Lock, Mail, AlertTriangle, Library, KeyRound, User, Bot, LifeBuoy
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoginForm from '@/components/LoginForm';
import SaaSManagementView from '@/components/admin/SaaSManagementView';
import BibliotecaAdminView from '@/components/admin/BibliotecaAdminView';
import TicketsAdminView from '@/components/admin/TicketsAdminView';
import MCMLogo from '@/components/MCMLogo';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [vista, setVista] = useState<'clubes' | 'usuarios' | 'suscripciones' | 'metricas' | 'configuracion' | 'auditoria' | 'saas-billing' | 'biblioteca' | 'mi-cuenta' | 'tickets'>('clubes');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clubes, setClubes] = useState<any[]>([]);
  const [usuariosGlobales, setUsuariosGlobales] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [configAdmin, setConfigAdmin] = useState<any>({});
  const [fetching, setFetching] = useState(true);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [clubAudit, setClubAudit] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '', slug: '', logo_url: '', color_primario: '#84cc16', correo_director: '', password_director: ''
  });

  // SaaS Governance State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    nombre: '', correo_administrativo: '', telefono_contacto: '', direccion: '', nombre_legal: '', sync_director_email: false, director_password: '', director_id: '', fecha_fin_prueba: '', tarifa_por_jugador: 2000, plan_id: '' as string | number
  });
  const [userFormData, setUserFormData] = useState({ newPassword: '', newEmail: '' });
  const [adminFormData, setAdminFormData] = useState({ nombres: '', apellidos: '', email: '', password: '' });
  
  // Mi Cuenta (SuperAdmin credentials)
  const [miCuentaData, setMiCuentaData] = useState({ newEmail: '', newPassword: '', confirmPassword: '' });
  const [miCuentaLoading, setMiCuentaLoading] = useState(false);
  // Bandera para ignorar eventos de auth durante actualización de credenciales
  const isUpdatingCredentials = useRef(false);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('perfiles').select('*').limit(50);
    setUsuariosGlobales(data || []);
  };

  useEffect(() => {
    if (vista === 'usuarios') cargarUsuarios();
  }, [vista]);

  const adminTenant = {
    config: { nombre: 'Master Club Manager', color: '#84cc16', logo: '/logo_mcm.png' }
  };

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

  const [planesSaaS, setPlanesSaaS] = useState<any[]>([]);
  const [planesLoading, setPlanesLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    id: null as number | null,
    nombre: '',
    tipo_cobro: 'mensual',
    precio_base: 0,
    limite_jugadores_base: 120,
    precio_jugador_extra: 0,
    activo: true
  });

  const cargarTodo = async () => {
    setFetching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAdmin(false); setFetching(false); return; }
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol?.toLowerCase() !== 'superadmin') { setIsAdmin(false); setFetching(false); return; }
    setIsAdmin(true);
    const [resClubes, resMetrics, resLogs, resConfig, resPlanes] = await Promise.all([
      // Agregamos created_at y updated_at_dummy (ficticio o existente) para limpiar el cache
      supabase.from('clubes').select('*, planes_saas(id, nombre, tipo_cobro, precio_base, limite_jugadores_base), created_at').neq('estado', 'Eliminado').order('created_at', { ascending: false }),
      fetch('/api/admin/metrics').then(r => r.json()),
      supabase.from('logs_auditoria').select('*').order('fecha', { ascending: false }).limit(50),
      supabase.from('configuracion_superadmin').select('*').eq('id', 1).maybeSingle(),
      supabase.from('planes_saas').select('*').order('id', { ascending: true })
    ]);
    setClubes(resClubes.data || []);
    setMetrics(resMetrics);
    setLogs(resLogs.data || []);
    if (resConfig.data) setConfigAdmin(resConfig.data);
    setPlanesSaaS(resPlanes.data || []);
    setFetching(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanesLoading(true);
    try {
      const payload = {
        nombre: planFormData.nombre,
        tipo_cobro: planFormData.tipo_cobro,
        precio_base: planFormData.precio_base,
        limite_jugadores_base: planFormData.limite_jugadores_base,
        precio_jugador_extra: planFormData.precio_jugador_extra,
        activo: planFormData.activo
      };
      
      let res;
      if (planFormData.id) {
        res = await supabase.from('planes_saas').update(payload).eq('id', planFormData.id);
      } else {
        res = await supabase.from('planes_saas').insert(payload);
      }
      
      if (res.error) throw res.error;
      toast.success(planFormData.id ? 'Plan actualizado' : 'Plan creado exitosamente');
      setShowPlanModal(false);
      cargarTodo(); // recargar
    } catch (err: any) {
      toast.error('Error al guardar plan: ' + err.message);
    } finally {
      setPlanesLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Si estamos actualizando credenciales del superadmin, ignorar todos los eventos
      // para evitar que el USER_UPDATED / re-autenticación interna nos expulse
      if (isUpdatingCredentials.current) return;

      if (event === 'SIGNED_IN') {
        cargarTodo();
      }
      // Solo cerrar sesión si no hay sesión activa de verdad
      if (event === 'SIGNED_OUT' && !session) {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // ← Sin dependencias: solo se ejecuta una vez al montar


  const toggleEstadoClub = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
    const { error } = await supabase.from('clubes').update({ estado: nuevoEstado }).eq('id', id);
    if (error) toast.error('Error al cambiar estado');
    else { toast.success(`Club ${nuevoEstado}`); cargarTodo(); }
  };

  const eliminarClub = async (id: string, nombre: string) => {
    if (!window.confirm(`¿ESTÁS SEGURO? Esto eliminará "${nombre.toUpperCase()}" permanentemente.`)) return;
    try {
      const res = await fetch(`/api/admin/clubes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Club eliminado'); cargarTodo();
    } catch (e: any) { toast.error('Error al eliminar: ' + e.message); }
  };

  const handleCrearClub = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const response = await fetch('/api/admin/clubes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setClubes([data, ...clubes]);
      setShowModal(false);
      setFormData({ nombre: '', slug: '', logo_url: '', color_primario: '#84cc16', correo_director: '', password_director: '' });
      toast.success('¡Academia registrada con éxito!');
    } catch (err: any) { toast.error('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleEditClub = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedClub?.id) return; setLoading(true);
    try {
      const response = await fetch(`/api/admin/clubes/${selectedClub.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFormData) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al actualizar');
      toast.success('Club actualizado'); setShowEditModal(false); cargarTodo();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleManageUser = async (action: 'RESET_PASSWORD' | 'CHANGE_EMAIL') => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/governance/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selectedUser.id, action, payload: userFormData }) });
      if (!response.ok) throw new Error('Error en la operación');
      toast.success('Operación exitosa'); setShowUserModal(false); setUserFormData({ newPassword: '', newEmail: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const response = await fetch('/api/admin/governance/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CREATE_ADMIN', payload: adminFormData }) });
      if (!response.ok) throw new Error('Error al crear administrador');
      toast.success('Nuevo SuperAdmin creado'); setShowCreateAdminModal(false);
      setAdminFormData({ nombres: '', apellidos: '', email: '', password: '' }); cargarUsuarios();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdateMiCuenta = async (tipo: 'email' | 'password') => {
    if (tipo === 'password' && miCuentaData.newPassword !== miCuentaData.confirmPassword) {
      toast.error('Las contraseñas no coinciden'); return;
    }
    setMiCuentaLoading(true);
    // Bloquear el listener de auth para que el USER_UPDATED no nos expulse
    isUpdatingCredentials.current = true;
    try {
      const updates: any = {};
      if (tipo === 'email') updates.email = miCuentaData.newEmail;
      if (tipo === 'password') updates.password = miCuentaData.newPassword;
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw new Error(error.message);
      toast.success(tipo === 'email' ? 'Correo actualizado. Revisa tu bandeja para confirmar.' : 'Contraseña actualizada correctamente');
      setMiCuentaData({ newEmail: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setMiCuentaLoading(false);
      // Esperar 2s antes de reactivar el listener, para que Supabase
      // termine de procesar todos los eventos internos del updateUser
      setTimeout(() => { isUpdatingCredentials.current = false; }, 2000);
    }
  };

  if (isAdmin === false) return <LoginForm tenant={adminTenant} />;
  if (isAdmin === null || (fetching && clubes.length === 0)) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-lime-500 animate-spin" />
    </div>
  );

  const navItems = [
    { id: 'clubes', icon: <Building2 size={20} />, label: 'Clubes' },
    { id: 'usuarios', icon: <Users size={20} />, label: 'Usuarios' },
    { id: 'saas-billing', icon: <CreditCard size={20} />, label: 'Planes' },
    { id: 'metricas', icon: <TrendingUp size={20} />, label: 'Métricas' },
    { id: 'biblioteca', icon: <Library size={20} />, label: 'Biblioteca' },
    { id: 'tickets', icon: <LifeBuoy size={20} />, label: 'Tickets' },
    { id: 'auditoria', icon: <History size={20} />, label: 'Auditoría' },
    { id: 'mi-cuenta', icon: <User size={20} />, label: 'Mi Cuenta' },
    { id: 'configuracion', icon: <Settings size={20} />, label: 'Ajustes' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">

      {/* ── SIDEBAR (Desktop) ── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 hidden md:flex flex-col z-50 shadow-sm">
        <div className="mb-8">
          <MCMLogo width={180} height={48} />
          <p className="text-xs text-gray-400 font-semibold mt-3 ml-1">Panel SuperAdmin</p>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.slice(0, 7).map(item => (
            <SideNavItem key={item.id} icon={item.icon} label={item.label} active={vista === item.id} onClick={() => setVista(item.id as any)} />
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4 space-y-1">
          <SideNavItem icon={<User size={18} />} label="Mi Cuenta" active={vista === 'mi-cuenta'} onClick={() => setVista('mi-cuenta')} />
          <SideNavItem icon={<Settings size={18} />} label="Configuración" active={vista === 'configuracion'} onClick={() => setVista('configuracion')} />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success('Sesión cerrada');
              setIsAdmin(false);
              router.refresh();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all group text-left"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-semibold">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── TOPBAR (Mobile) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <MCMLogo width={140} height={38} />
        <button
          onClick={async () => { await supabase.auth.signOut(); setIsAdmin(false); router.refresh(); }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* ── BOTTOM NAV (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 shadow-lg">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setVista(item.id as any)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${vista === item.id ? 'text-lime-600' : 'text-gray-400'}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setVista('mi-cuenta')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${vista === 'mi-cuenta' ? 'text-lime-600' : 'text-gray-400'}`}
        >
          <User size={20} />
          <span className="text-[10px] font-bold">Cuenta</span>
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="md:ml-64 pt-20 md:pt-0 pb-24 md:pb-0 p-4 md:p-8">

        {/* MÉTRICAS HEADER */}
        {(vista === 'clubes' || vista === 'metricas') && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300 mb-8">
            <MetricCard label="Recaudo SaaS" value={`$${metrics?.recaudoSaaS?.toLocaleString('es-CO') || '0'}`} icon={<CreditCard className="text-emerald-500" size={20} />} sub="Ingresos de Plataforma" color="emerald" />
            <MetricCard label="Volumen Transaccional" value={`$${metrics?.volumenTransaccional?.toLocaleString('es-CO') || '0'}`} icon={<Activity className="text-blue-500" size={20} />} sub="Flujo total de clubes" color="blue" />
            <MetricCard label="Jugadores" value={metrics?.totalJugadores || 0} icon={<Users className="text-lime-500" size={20} />} sub="Totales registrados" color="lime" />
            <MetricCard label="Clubes" value={`${metrics?.clubesActivos || 0}/${metrics?.totalClubes || 0}`} icon={<ShieldCheck className="text-violet-500" size={20} />} sub="Activos / Total" color="violet" />
          </section>
        )}

        {/* ── VISTA CLUBES ── */}
        {vista === 'clubes' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Gestión de Clubes</h2>
                <p className="text-sm text-gray-500">Academias conectadas al ecosistema MCM</p>
              </div>
              <button onClick={() => setShowModal(true)} className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-lime-200 text-sm">
                <Plus size={18} /> Nueva Academia
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
              {fetching && clubes.length === 0 ? (
                <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>
              ) : (
                <>
                  {fetching && clubes.length > 0 && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-lime-100 overflow-hidden z-10">
                      <div className="h-full bg-lime-500 animate-pulse w-1/2 rounded-full"></div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="text-left px-6 py-4">Club</th>
                          <th className="text-center px-6 py-4">Atletas</th>
                          <th className="px-6 py-4 hidden md:table-cell">Canon SaaS</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="text-right px-6 py-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {clubes.map(club => (
                          <ClubRow
                            key={club.id} club={club}
                            count={metrics?.alumnosPorClub?.[club.id] || 0}
                            onToggle={toggleEstadoClub} onAudit={auditClub}
                            onEdit={(c: any) => {
                              setSelectedClub(c);
                              setEditFormData({ nombre: c.nombre, correo_administrativo: c.correo_administrativo || '', telefono_contacto: c.telefono_contacto || '', direccion: c.direccion || '', nombre_legal: c.nombre_legal || '', sync_director_email: false, director_password: '', director_id: '', fecha_fin_prueba: c.fecha_fin_prueba ? new Date(c.fecha_fin_prueba).toISOString().split('T')[0] : '', tarifa_por_jugador: c.tarifa_por_jugador || 2000, plan_id: c.plan_id || '' });
                              setShowEditModal(true);
                            }}
                            onDelete={eliminarClub}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── VISTA USUARIOS ── */}
        {vista === 'usuarios' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Usuarios Globales</h2>
                <p className="text-sm text-gray-500">Distribución de miembros por academia</p>
              </div>
              <button onClick={() => setShowCreateAdminModal(true)} className="bg-violet-500 hover:bg-violet-400 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg text-sm">
                <ShieldCheck size={16} /> Crear SuperAdmin
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubes.map(club => {
                const miembrosClub = usuariosGlobales.filter(u => u.club_id === club.id);
                if (miembrosClub.length === 0) return null;
                return (
                  <div key={club.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 p-1.5 flex items-center justify-center overflow-hidden">
                        <img src={club.logo_url} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{club.nombre}</h3>
                        <p className="text-xs text-gray-400">{miembrosClub.length} miembros</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {miembrosClub.slice(0, 3).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-lime-100 text-lime-700 flex items-center justify-center text-[10px] font-black">{u.nombres?.charAt(0)}</div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{u.nombres}</p>
                              <p className="text-[10px] text-gray-400">{u.rol}</p>
                            </div>
                          </div>
                          <button onClick={() => { setSelectedUser(u); setUserFormData({ newPassword: '', newEmail: u.email_contacto || '' }); setShowUserModal(true); }} className="text-gray-400 hover:text-lime-600 p-1 transition-colors"><Lock size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VISTA MÉTRICAS ── */}
        {vista === 'metricas' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h2 className="text-2xl font-black text-slate-800">Métricas Master</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Jugadores por Academia</h4>
                <div className="space-y-4">
                  {clubes.slice(0, 5).map(c => (
                    <div key={c.id}>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">{c.nombre}</span>
                        <span className="text-lime-600">{metrics?.alumnosPorClub?.[c.id] || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-lime-500 rounded-full transition-all" style={{ width: `${Math.min(((metrics?.alumnosPorClub?.[c.id] || 0) / 50) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
                <TrendingUp className="text-lime-500 mb-4" size={40} />
                <h4 className="text-lg font-black text-slate-800 mb-2">Tendencia de Crecimiento</h4>
                <p className="text-sm text-gray-500 max-w-xs">El ecosistema ha crecido un 15% este mes. Se proyectan 3 nuevas aperturas para el próximo trimestre.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── VISTA AUDITORÍA ── */}
        {vista === 'auditoria' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Historial de Auditoría</h2>
                <p className="text-sm text-gray-500">Control de operaciones maestras MCM</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-lime-50 border border-lime-200 rounded-xl text-lime-700 text-xs font-bold">
                <ShieldCheck size={14} /> Blindaje Activo
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${log.accion.includes('ELIMINAR') || log.accion.includes('DELETE') ? 'bg-red-100 text-red-500' : 'bg-lime-100 text-lime-600'}`}>
                    <History size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate">{log.accion.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500 truncate">{log.descripcion}</p>
                  </div>
                  <p className="text-xs text-gray-400 font-medium whitespace-nowrap hidden sm:block">{new Date(log.fecha).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'saas-billing' && <SaaSManagementView />}
        {vista === 'biblioteca' && <BibliotecaAdminView />}
        {vista === 'tickets' && <TicketsAdminView />}

        {/* ── VISTA CONFIGURACIÓN ── */}
        {vista === 'configuracion' && (
          <div className="animate-in fade-in duration-300 max-w-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Configuración</h2>
            <p className="text-sm text-gray-500 mb-6">Ajustes generales del núcleo de la plataforma.</p>
            <div className="space-y-3 mb-8">
              <SettingToggle label="Modo de Mantenimiento" sub="Suspender acceso a todos los clubes" enabled={false} />
              <SettingToggle label="Registro de Nuevos Clubes" sub="Permitir onboarding desde la Landing Page" enabled={true} />
            </div>
            
            <h3 className="font-bold text-slate-800 mb-4 border-t pt-6">Facturación SaaS y Soporte</h3>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">WhatsApp de Soporte (Pagos)</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={configAdmin.telefono_soporte || ''} 
                   onChange={e => setConfigAdmin({...configAdmin, telefono_soporte: e.target.value})}
                   className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
                 />
                 <button 
                   onClick={async () => {
                      const val = configAdmin.telefono_soporte;
                      const res = await fetch('/api/admin/configuracion', {
                        method: 'POST',
                        body: JSON.stringify({ telefono_soporte: val })
                      });
                      if (!res.ok) toast.error('Error al guardar');
                     else toast.success('Teléfono actualizado');
                   }}
                   className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
                 >
                   Guardar
                 </button>
               </div>
               <p className="text-xs text-gray-400 mt-2">A este número se redirigirán los clubes suspendidos por mora.</p>
            </div>

            <h3 className="font-bold text-slate-800 mb-4 border-t pt-6 flex items-center gap-2"><Bot size={18} /> Inteligencia Artificial (Gibbi)</h3>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Clave API de Gemini</label>
               <div className="flex gap-2">
                 <input 
                   type="password" 
                   placeholder="AIzaSy..." 
                   value={configAdmin.gemini_api_key || ''} 
                   onChange={e => setConfigAdmin({...configAdmin, gemini_api_key: e.target.value})}
                   className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
                 />
                 <button 
                   onClick={async () => {
                      const val = configAdmin.gemini_api_key;
                      const res = await fetch('/api/admin/configuracion', {
                        method: 'POST',
                        body: JSON.stringify({ gemini_api_key: val })
                      });
                      if (!res.ok) {
                        toast.error('Error al guardar en la base de datos.');
                      }
                      else toast.success('API Key guardada. Gibbi ya puede funcionar.');
                   }}
                   className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
                 >
                   Guardar
                 </button>
               </div>
               <p className="text-xs text-gray-400 mt-2">Si está vacío, Gibbi no responderá mensajes generativos a los clubes.</p>
            </div>

            <h3 className="font-bold text-slate-800 mb-4 border-t pt-6 flex items-center gap-2"><LifeBuoy size={18} /> Integraciones de Soporte</h3>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Slack Webhook URL (Tickets)</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="https://hooks.slack.com/services/..." 
                   value={configAdmin.slack_webhook_url || ''} 
                   onChange={e => setConfigAdmin({...configAdmin, slack_webhook_url: e.target.value})}
                   className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
                 />
                 <button 
                   onClick={async () => {
                      const val = configAdmin.slack_webhook_url;
                      const res = await fetch('/api/admin/configuracion', {
                        method: 'POST',
                        body: JSON.stringify({ slack_webhook_url: val })
                      });
                      if (!res.ok) {
                        toast.error('Error al guardar en la base de datos.');
                     }
                     else toast.success('Webhook de Slack guardado.');
                   }}
                   className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
                 >
                   Guardar
                 </button>
               </div>
               <p className="text-xs text-gray-400 mt-2">Los nuevos tickets se enviarán automáticamente a este canal de Slack.</p>
            </div>
          </div>
        )}

        {/* ── VISTA MI CUENTA ── */}
        {vista === 'mi-cuenta' && (
          <div className="animate-in fade-in duration-300 max-w-lg">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Mi Cuenta</h2>
            <p className="text-sm text-gray-500 mb-6">Actualiza tus credenciales de acceso como SuperAdmin.</p>

            {/* Cambiar Email */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Mail size={18} /></div>
                <div>
                  <h3 className="font-bold text-slate-800">Cambiar Correo Electrónico</h3>
                  <p className="text-xs text-gray-400">Recibirás un enlace de confirmación al nuevo correo</p>
                </div>
              </div>
              <input
                type="email"
                placeholder="nuevo@correo.com"
                value={miCuentaData.newEmail}
                onChange={e => setMiCuentaData({ ...miCuentaData, newEmail: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none mb-3 bg-gray-50"
              />
              <button
                onClick={() => handleUpdateMiCuenta('email')}
                disabled={miCuentaLoading || !miCuentaData.newEmail}
                className="w-full bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {miCuentaLoading ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> Actualizar Correo</>}
              </button>
            </div>

            {/* Cambiar Contraseña */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-lime-50 rounded-xl flex items-center justify-center text-lime-600"><KeyRound size={18} /></div>
                <div>
                  <h3 className="font-bold text-slate-800">Cambiar Contraseña</h3>
                  <p className="text-xs text-gray-400">Mínimo 8 caracteres, incluye letras y números</p>
                </div>
              </div>
              <div className="space-y-3 mb-3">
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={miCuentaData.newPassword}
                  onChange={e => setMiCuentaData({ ...miCuentaData, newPassword: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
                />
                <input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                  value={miCuentaData.confirmPassword}
                  onChange={e => setMiCuentaData({ ...miCuentaData, confirmPassword: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none bg-gray-50 ${miCuentaData.confirmPassword && miCuentaData.newPassword !== miCuentaData.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-lime-400'}`}
                />
                {miCuentaData.confirmPassword && miCuentaData.newPassword !== miCuentaData.confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> Las contraseñas no coinciden</p>
                )}
              </div>
              <button
                onClick={() => handleUpdateMiCuenta('password')}
                disabled={miCuentaLoading || !miCuentaData.newPassword || miCuentaData.newPassword !== miCuentaData.confirmPassword}
                className="w-full bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {miCuentaLoading ? <Loader2 className="animate-spin" size={16} /> : <><Lock size={16} /> Cambiar Contraseña</>}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── PANEL DETALLE CLUB ── */}
      {selectedClub && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-end">
          <div className="bg-white w-full max-w-lg h-full border-l border-gray-200 p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl p-2 flex items-center justify-center overflow-hidden border border-gray-200">
                  <img src={selectedClub.logo_url} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedClub.nombre}</h3>
                  <p className="text-lime-600 text-xs font-mono">/{selectedClub.slug}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedClub(null); setClubAudit(null); }} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            {detailsLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>
            ) : clubAudit && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold mb-1">Entrenadores</p>
                    <p className="text-2xl font-black text-slate-800">{clubAudit.stats?.coaches || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold mb-1">Categorías</p>
                    <p className="text-2xl font-black text-slate-800">{clubAudit.stats?.categorias || 0}</p>
                  </div>
                </div>

                <button onClick={() => { setEditFormData({ nombre: selectedClub.nombre, correo_administrativo: selectedClub.correo_administrativo || '', telefono_contacto: selectedClub.telefono_contacto || '', direccion: selectedClub.direccion || '', nombre_legal: selectedClub.nombre_legal || '', sync_director_email: false, director_password: '', director_id: '', fecha_fin_prueba: selectedClub.fecha_fin_prueba ? new Date(selectedClub.fecha_fin_prueba).toISOString().split('T')[0] : '', tarifa_por_jugador: selectedClub.tarifa_por_jugador || 2000, plan_id: selectedClub.plan_id || '' }); setShowEditModal(true); }} className="w-full bg-lime-500 text-white font-bold py-3 rounded-xl">
                  Editar Datos del Club
                </button>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Actividad Financiera Reciente</h4>
                  <div className="space-y-2">
                    {clubAudit.actividad?.length > 0 ? clubAudit.actividad.map((pago: any) => (
                      <div key={pago.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{pago.jugador_nombre || 'Alumno'}</p>
                          <p className="text-xs text-gray-400">{new Date(pago.fecha).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-black text-emerald-600">+${parseFloat(pago.total).toLocaleString('es-CO')}</p>
                      </div>
                    )) : <p className="text-sm text-gray-400 text-center py-4">No hay pagos recientes.</p>}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Zona de Peligro</h4>
                  <div className="flex gap-3">
                    <button onClick={() => toggleEstadoClub(selectedClub.id, selectedClub.estado)} className={`flex-1 font-bold py-3 px-4 rounded-xl text-sm transition-all ${selectedClub.estado === 'Activo' ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white' : 'bg-lime-500 text-white'}`}>
                      {selectedClub.estado === 'Activo' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <Link href={`/${selectedClub.slug}/director`} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                      <ArrowRightLeft size={14} /> Ver
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL PLAN SAAS ── */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">{planFormData.id ? 'Editar Plan' : 'Nuevo Plan SaaS'}</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Plan</label>
                <input type="text" required value={planFormData.nombre} onChange={e => setPlanFormData({...planFormData, nombre: e.target.value})} className="w-full border rounded-xl px-4 py-2" placeholder="Ej: Plan Anual Crecimiento" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cobro</label>
                <select value={planFormData.tipo_cobro} onChange={e => setPlanFormData({...planFormData, tipo_cobro: e.target.value})} className="w-full border rounded-xl px-4 py-2">
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Precio Base (COP)</label>
                <input type="number" required min="0" value={planFormData.precio_base} onChange={e => setPlanFormData({...planFormData, precio_base: Number(e.target.value)})} className="w-full border rounded-xl px-4 py-2" placeholder="1296000" />
                <p className="text-xs text-gray-500 mt-1">Lo que se cobra fijo por este plan.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Límite de Jugadores Base</label>
                <input type="number" required min="0" value={planFormData.limite_jugadores_base} onChange={e => setPlanFormData({...planFormData, limite_jugadores_base: Number(e.target.value)})} className="w-full border rounded-xl px-4 py-2" placeholder="120" />
                <p className="text-xs text-gray-500 mt-1">Cuántos jugadores incluye el Precio Base. (0 = ilimitados).</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Precio por Jugador Extra (COP)</label>
                <input type="number" required min="0" value={planFormData.precio_jugador_extra} onChange={e => setPlanFormData({...planFormData, precio_jugador_extra: Number(e.target.value)})} className="w-full border rounded-xl px-4 py-2" placeholder="1800" />
                <p className="text-xs text-gray-500 mt-1">Costo por cada jugador que exceda el límite base.</p>
              </div>
              <div className="flex items-center gap-2 mt-4 p-4 bg-gray-50 rounded-xl">
                <input type="checkbox" id="activoPlan" checked={planFormData.activo} onChange={e => setPlanFormData({...planFormData, activo: e.target.checked})} className="w-5 h-5 accent-lime-500" />
                <label htmlFor="activoPlan" className="text-sm font-bold text-gray-700 cursor-pointer">Plan Activo</label>
              </div>

              <div className="flex gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={() => setShowPlanModal(false)} className="flex-1 px-4 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={planesLoading} className="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-400 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  {planesLoading ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALES GOVERNANCE ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Building2 className="text-lime-600" size={20} /> Nueva Academia</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleCrearClub} className="space-y-4">
              <InputField label="Nombre Oficial" value={formData.nombre} onChange={v => setFormData({ ...formData, nombre: v })} placeholder="Eagles Football Academy" required />
              <InputField label="Subdominio (Slug)" value={formData.slug} onChange={v => setFormData({ ...formData, slug: v.toLowerCase().replace(/\s/g, '-') })} placeholder="eagles-fc" required mono />
              <InputField label="URL Logo" value={formData.logo_url} onChange={v => setFormData({ ...formData, logo_url: v })} placeholder="https://..." required />
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Color de Marca</label>
                <input value={formData.color_primario} onChange={e => setFormData({ ...formData, color_primario: e.target.value })} type="color" className="w-full border border-gray-200 rounded-xl h-12 p-1.5 cursor-pointer" />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-lime-600 uppercase tracking-widest mb-3">Credenciales del Director</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Correo" value={formData.correo_director} onChange={v => setFormData({ ...formData, correo_director: v })} placeholder="admin@club.com" required type="email" />
                  <InputField label="Contraseña Temporal" value={formData.password_director} onChange={v => setFormData({ ...formData, password_director: v })} placeholder="Pass1234!" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-lime-500 hover:bg-lime-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-200">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Confirmar Registro</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR CLUB ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Editar Club</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditClub} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nombre Comercial" value={editFormData.nombre} onChange={v => setEditFormData({ ...editFormData, nombre: v })} />
                <InputField label="Nombre Legal" value={editFormData.nombre_legal} onChange={v => setEditFormData({ ...editFormData, nombre_legal: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Correo Administrativo" value={editFormData.correo_administrativo} onChange={v => setEditFormData({ ...editFormData, correo_administrativo: v })} type="email" />
                <InputField label="Teléfono" value={editFormData.telefono_contacto} onChange={v => setEditFormData({ ...editFormData, telefono_contacto: v })} />
              </div>
              <InputField label="Dirección" value={editFormData.direccion} onChange={v => setEditFormData({ ...editFormData, direccion: v })} />

              <div className="border-t border-gray-100 pt-4 pb-2">
                <h4 className="text-xs font-bold text-lime-600 uppercase tracking-widest mb-3">Facturación SaaS</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Fin Periodo Prueba</label>
                    <input 
                      type="date" 
                      value={editFormData.fecha_fin_prueba} 
                      onChange={e => setEditFormData({...editFormData, fecha_fin_prueba: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-gray-50"
                    />
                  </div>
                </div>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-3 mt-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Facturación SaaS</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Plan de Suscripción</label>
                        <select 
                          value={editFormData.plan_id} 
                          onChange={e => setEditFormData({...editFormData, plan_id: e.target.value})}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-white"
                        >
                          <option value="">Sin plan (Personalizado)</option>
                          {planesSaaS.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.tipo_cobro})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tarifa Custom (Solo si no hay plan)</label>
                        <input 
                          type="number" 
                          value={editFormData.tarifa_por_jugador} 
                          onChange={e => setEditFormData({...editFormData, tarifa_por_jugador: Number(e.target.value)})}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-white"
                          disabled={!!editFormData.plan_id}
                        />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-amber-700">Sincronizar email del Director</p>
                  <p className="text-xs text-amber-600">¿Actualizar email de login del Director?</p>
                </div>
                <button type="button" onClick={() => setEditFormData({ ...editFormData, sync_director_email: !editFormData.sync_director_email })} className={`w-11 h-6 rounded-full transition-colors relative ${editFormData.sync_director_email ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${editFormData.sync_director_email ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {editFormData.sync_director_email && (
                <InputField label="Nueva Contraseña del Director (opcional)" value={editFormData.director_password} onChange={v => setEditFormData({ ...editFormData, director_password: v })} placeholder="Dejar vacío para no cambiar" />
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-3 text-sm font-bold text-white bg-lime-500 rounded-xl shadow-lg shadow-lime-200">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GESTIÓN CREDENCIALES USUARIO ── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-slate-800">Seguridad del Usuario</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-6">Gestionando: <strong>{selectedUser?.nombres}</strong></p>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Cambiar Email</label>
                <div className="flex gap-2">
                  <input type="email" placeholder="Nuevo correo" value={userFormData.newEmail} onChange={e => setUserFormData({ ...userFormData, newEmail: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-gray-50" />
                  <button onClick={() => handleManageUser('CHANGE_EMAIL')} className="px-3 py-2 bg-lime-500 text-white rounded-xl text-xs font-bold hover:bg-lime-400 transition-colors">OK</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Resetear Contraseña</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nueva contraseña temporal" value={userFormData.newPassword} onChange={e => setUserFormData({ ...userFormData, newPassword: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-lime-400 outline-none bg-gray-50" />
                  <button onClick={() => handleManageUser('RESET_PASSWORD')} className="px-3 py-2 bg-lime-500 text-white rounded-xl text-xs font-bold hover:bg-lime-400 transition-colors">OK</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR SUPER ADMIN ── */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-slate-800">Nuevo SuperAdmin</h3>
              <button onClick={() => setShowCreateAdminModal(false)} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-5">Este usuario tendrá control total sobre el ecosistema.</p>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nombres" value={adminFormData.nombres} onChange={v => setAdminFormData({ ...adminFormData, nombres: v })} />
                <InputField label="Apellidos" value={adminFormData.apellidos} onChange={v => setAdminFormData({ ...adminFormData, apellidos: v })} />
              </div>
              <InputField label="Email" value={adminFormData.email} onChange={v => setAdminFormData({ ...adminFormData, email: v })} type="email" />
              <InputField label="Contraseña" value={adminFormData.password} onChange={v => setAdminFormData({ ...adminFormData, password: v })} type="password" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateAdminModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-3 text-sm font-bold text-white bg-violet-500 rounded-xl">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Crear Guardián'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes Auxiliares ──

function SideNavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-left ${active ? 'bg-lime-50 text-lime-700 font-bold border border-lime-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-semibold'}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function MetricCard({ label, value, icon, sub, color = "lime" }: any) {
  const colorMap: any = {
    lime: "bg-lime-50 border-lime-200",
    blue: "bg-blue-50 border-blue-200",
    emerald: "bg-emerald-50 border-emerald-200",
    violet: "bg-violet-50 border-violet-200",
  };
  return (
    <div className={`bg-white border ${colorMap[color]} p-5 rounded-2xl shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm">{icon}</div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">Live</span>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function ClubRow({ club, count, onToggle, onAudit, onEdit, onDelete }: any) {
  const [host, setHost] = useState('');
  useEffect(() => { setHost(window.location.host); }, []);
  const getClubUrl = () => {
    if (!host) return '#';
    if (host.includes('localhost')) return `http://localhost:3000/${club.slug}/director`;
    return `https://${host}/${club.slug}/director`;
  };
  const precioSaaS = club.planes_saas?.precio_por_jugador || 2000;
  const canonMensual = count * precioSaaS;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 p-1 flex items-center justify-center overflow-hidden">
            <img src={club.logo_url} className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800">{club.nombre}</p>
            <a href={getClubUrl()} target="_blank" className="text-xs text-gray-400 hover:text-lime-600 flex items-center gap-1 transition-colors">
              <Globe size={10} /> /{club.slug}
            </a>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-lg font-black text-slate-800">{count}</span>
        <span className="text-xs text-gray-400 block">atletas</span>
      </td>
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm font-black text-emerald-600">${canonMensual.toLocaleString('es-CO')}</span>
        <span className="text-xs text-gray-400 block">/ mes</span>
      </td>
      <td className="px-6 py-4">
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${club.estado === 'Activo' ? 'bg-lime-50 text-lime-700 border-lime-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {club.estado}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onToggle(club.id, club.estado)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${club.estado === 'Activo' ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-lime-600 border-lime-200 hover:bg-lime-50'}`}>
            {club.estado === 'Activo' ? 'Suspender' : 'Reactivar'}
          </button>
          <button onClick={() => onEdit(club)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all">Editar</button>
          <button onClick={() => onAudit(club)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-all">Ver</button>
          <button onClick={() => onDelete(club.id, club.nombre)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function InputField({ label, value, onChange, placeholder = '', required = false, type = 'text', mono = false }: { label?: string, value: string, onChange: (v: string) => void, placeholder?: string, required?: boolean, type?: string, mono?: boolean }) {
  return (
    <div>
      {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>}
      <input
        type={type} required={required} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50 transition-colors ${mono ? 'font-mono text-lime-600' : ''}`}
      />
    </div>
  );
}

function SettingToggle({ label, sub, enabled }: { label: string, sub: string, enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
      <div>
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <button onClick={() => setOn(!on)} className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-lime-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${on ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
