'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList 
} from 'recharts';
import { 
  Wallet, Users, ClipboardList, Calendar, TrendingUp, BarChart2, 
  Zap, AlertTriangle, ArrowUpRight, TrendingDown, ShieldCheck, MessageSquare, RefreshCw, CheckCheck, X 
} from 'lucide-react';
import { toast } from 'sonner';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';
import { generarReciboPDFBase64 } from '@/lib/recibo-utils';
import { Loader } from 'lucide-react';

export default function DashboardDirector() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState({
    totalMiembros: 0,
    alDia: 0,
    porcentajeAlDia: 0,
    totalGrupos: 0,
    conDeuda: 0,
    ingresosProyectados: 0,
    deudaEstimada: 0,
    tasaAsistencia: 0
  });
  const [dataCrecimiento, setDataCrecimiento] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [todasLasAlertas, setTodasLasAlertas] = useState<any[]>([]);
  const [gruposRendimiento, setGruposRendimiento] = useState<any[]>([]);
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [planesList, setPlanesList] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      try {
        // Pequeño delay de 50ms para evitar 'AbortError: Lock broken' de Next SSR en peticiones concurrentes
        await new Promise(r => setTimeout(r, 50));
        
        const tenantRes = await fetch('/api/tenant', { cache: 'no-store' });
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        // Si es el dominio maestro (sin ID de club), no hay nada que mostrar aquí
        if (tenantData.slug === 'master' || !tenantData.id) {
          router.push('/admin');
          return;
        }

        const hoy = new Date();
        const inicioHoy = new Date(hoy);
        inicioHoy.setHours(0, 0, 0, 0);
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const [
          { data: jugadores, error: errJug },
          { data: planesData },
          { data: pagosMes },
          { data: asistData },
          { data: msgRes }
        ] = await Promise.all([
          supabase.from('perfiles').select('*').eq('club_id', tenantData.id).eq('rol', 'Futbolista').neq('estado_miembro', 'Pendiente'),
          supabase.from('planes').select('*').eq('club_id', tenantData.id),
          supabase.from('pagos_ingresos').select('*').eq('club_id', tenantData.id),
          supabase.from('asistencias').select('jugador_id, estado').eq('club_id', tenantData.id),
          supabase.from('mensajes_wa').select('destinatario_numero').eq('club_id', tenantData.id).gte('created_at', inicioHoy.toISOString())
        ]);

        if (errJug) throw errJug;

        const notificadosHoy = new Set(msgRes?.map(m => m.destinatario_numero) || []);
        if (planesData) setPlanesList(planesData);

        if (jugadores) {
          const total = jugadores.length;
          const mesPrefijo = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
          const pagosFiltrados = pagosMes?.filter(p => p.fecha && String(p.fecha).startsWith(mesPrefijo)) || [];
          const idsPagados = new Set(pagosFiltrados.map((p: any) => p.jugador_id));
          const preciosMap = new Map(planesData?.map(p => [p.nombre, Number(p.precio_base)]) || []);

          let totalProyectado = 0;
          let alDiaCount = 0;
          const morosos: any[] = [];

          jugadores.forEach(j => {
            const precio = preciosMap.get(j.tipo_plan || 'Regular') || 0;
            totalProyectado += precio;
            const tienePago = idsPagados.has(j.id);
            const esBecado = precio === 0;
            if (tienePago || esBecado) alDiaCount++;
            if (!tienePago && !esBecado && j.estado_pago !== 'Al día') {
              const numLimpio = String(j.telefono || '').replace(/\D/g, '');
              morosos.push({ 
                ...j, 
                motivo: 'Pago Pendiente', 
                prioridad: 'Alta',
                yaNotificado: notificadosHoy.has(numLimpio) || notificadosHoy.has(`57${numLimpio}`)
              });
            }
          });

          const mesesNombre = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const crecimientoMap: any = {};
          for(let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${mesesNombre[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            crecimientoMap[key] = 0;
          }
          jugadores.forEach(p => {
            const d = new Date(p.created_at);
            const key = `${mesesNombre[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (crecimientoMap.hasOwnProperty(key)) crecimientoMap[key]++;
          });
          const dataGrafico = Object.entries(crecimientoMap).map(([name, total]) => ({ name, total }));

          const alertasBajaAsistencia = jugadores.filter(j => {
            const misAsis = asistData?.filter(a => a.jugador_id === j.id) || [];
            if (misAsis.length < 3) return false;
            const presentes = misAsis.filter(a => a.estado === 'Presente').length;
            return (presentes / misAsis.length) < 0.5;
          }).map(j => {
            const numLimpio = String(j.telefono || '').replace(/\D/g, '');
            return { 
              ...j, 
              motivo: 'Baja Asistencia', 
              prioridad: 'Media',
              yaNotificado: notificadosHoy.has(numLimpio) || notificadosHoy.has(`57${numLimpio}`)
            };
          });

          const ingresosReales = pagosFiltrados.reduce((acc: number, current: any) => acc + (Number(current.total || current.monto || current.monto_base) || 0), 0);

          setStats({
            totalMiembros: total,
            alDia: alDiaCount,
            porcentajeAlDia: total > 0 ? Math.round((alDiaCount / total) * 100) : 0,
            totalGrupos: [...new Set(jugadores.map(j => j.grupos).filter(Boolean))].length,
            conDeuda: total - alDiaCount,
            ingresosProyectados: totalProyectado,
            deudaEstimada: totalProyectado - ingresosReales,
            tasaAsistencia: asistData && asistData.length > 0 ? Math.round((asistData.filter(a => a.estado === 'Presente').length / asistData.length) * 100) : 0
          });

          setTodasLasAlertas([...morosos, ...alertasBajaAsistencia]);
          setDataCrecimiento(dataGrafico);
          setAlertas([...morosos.slice(0, 3), ...alertasBajaAsistencia.slice(0, 2)]);
          setActividadReciente(jugadores.slice(0, 5));
          
          const gMap = jugadores.reduce((acc: any, p) => {
            acc[p.grupos || 'Sin Asignar'] = (acc[p.grupos || 'Sin Asignar'] || 0) + 1;
            return acc;
          }, {});
          setGruposRendimiento(Object.entries(gMap).map(([nombre, cantidad]) => ({ nombre, cantidad: cantidad as number })));
        }
      } catch (error: any) {
        toast.error("Error dashboard: " + error.message);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [router]);

  const [enviandoWA, setEnviandoWA] = useState<string | null>(null);

  const handleNotificarWhatsApp = async (alerta: any) => {
    if (!alerta.telefono) { toast.error("Sin teléfono."); return; }
    setEnviandoWA(alerta.id);
    const clubName = tenant?.config?.nombre || 'Gibbor App';
    const mensaje = `⚽ *${clubName.toUpperCase()}* \n\nHola *${alerta.nombres}*, te recordamos tu compromiso con la academia. ¡Nos vemos en el campo! 🏟️`;
    const result = await enviarMensajeWhatsApp(alerta.telefono, mensaje);
    if (result.success) {
      toast.success(`Enviado a ${alerta.nombres}`);
      setAlertas(prev => prev.map(a => a.id === alerta.id ? { ...a, yaNotificado: true } : a));
    } else toast.error("Error WA");
    setEnviandoWA(null);
  };

  if (cargando && !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  const brandName = tenant?.config?.nombre || 'Gibbor App';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 mb-6 shadow-xl flex justify-between items-center relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-brand"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-black text-white mb-1">¡Bienvenido a {brandName}!</h1>
          <p className="text-sm text-slate-400">Panel de Control Multiclub Gibbor Cloud.</p>
        </div>
        <div className="hidden md:block w-32 h-32 bg-brand/10 rounded-full absolute -right-10 -top-10 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand/40 transition-all cursor-pointer group" onClick={() => router.push('/director/cobranza')}>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">Pagos al día</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.alDia} <span className="text-sm font-normal text-slate-400">/ {stats.totalMiembros}</span></p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stats.porcentajeAlDia}% de alumnos vinculados</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand/40 transition-all cursor-pointer group" onClick={() => router.push('/director/categorias')}>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">Grupos Activos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalGrupos}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Categorías en entrenamiento</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand/40 transition-all cursor-pointer group" onClick={() => router.push('/director/asistencia')}>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">Tasa de Asistencia</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.tasaAsistencia}%</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Promedio global del mes</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand/40 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-brand-muted text-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">Eventos Próximos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">0</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sin torneos programados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Crecimiento de Atletas</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Histórico últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-2 bg-brand-muted px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 text-brand" />
              <span className="text-xs font-black text-brand uppercase tracking-tighter">En ascenso</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataCrecimiento}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tenant?.config?.color === '#ffffff' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="total" stroke="var(--brand-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Alertas Inteligentes</h3>
            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">Acción Requerida</span>
          </div>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <ShieldCheck className="w-12 h-12 text-emerald-100 mb-3" />
                <p className="text-sm font-bold text-slate-500">Todo en orden</p>
              </div>
            ) : (
              alertas.map((alerta, idx) => (
                <div key={idx} className="group p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-100 text-red-600' : 'bg-brand-muted text-brand'}`}>
                      {alerta.motivo === 'Pago Pendiente' ? <Wallet className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-[11px] truncate">{alerta.nombres} {alerta.apellidos}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{alerta.motivo}</p>
                    </div>
                    <button 
                      onClick={() => !alerta.yaNotificado && handleNotificarWhatsApp(alerta)}
                      disabled={enviandoWA === alerta.id || alerta.yaNotificado}
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        alerta.yaNotificado 
                          ? 'bg-emerald-50 text-emerald-500 cursor-default' 
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      {enviandoWA === alerta.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : alerta.yaNotificado ? <CheckCheck className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => setIsAlertsModalOpen(true)}
            className="mt-4 w-full py-2.5 text-[10px] font-black text-slate-400 hover:text-brand hover:bg-brand-muted rounded-xl transition-all border-2 border-dashed border-slate-100 dark:border-slate-800 uppercase tracking-widest"
          >
            Ver todas ({todasLasAlertas.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Distribución por Categorías</h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gruposRendimiento} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke={tenant?.config?.color === '#ffffff' ? '#334155' : '#f1f5f9'} />
                <XAxis type="number" hide />
                <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} width={100} />
                <Tooltip cursor={{fill: 'rgba(var(--brand-primary-rgb), 0.05)'}} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Bar dataKey="cantidad" radius={[0, 8, 8, 0]} barSize={24}>
                  {gruposRendimiento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--brand-primary)' : 'rgba(var(--brand-primary-rgb), 0.7)'} />
                  ))}
                  <LabelList dataKey="cantidad" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
            <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Nuevos Miembros</h3>
            <ArrowUpRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-6 pb-4">
              {actividadReciente.map((perfil) => (
                <div key={perfil.id} className="relative pl-6">
                  <div className={`absolute w-3 h-3 bg-brand rounded-full left-[-7px] top-1.5 ring-4 ring-white dark:ring-slate-900 shadow-sm`}></div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-100 truncate">{perfil.nombres} {perfil.apellidos}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{perfil.grupos || 'Sin asignar'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isAlertsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="w-full max-w-xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/20">
                       <AlertTriangle className="text-white w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Centro de Alertas</h2>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Incidentes Críticos</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAlertsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 <div className="bg-brand-muted p-4 rounded-2xl border border-brand/10 mb-6">
                    <p className="text-xs text-brand font-bold leading-relaxed">
                       Tienes <strong>{todasLasAlertas.length} alertas activas</strong>. Gestiona rápidamente los pagos y la asistencia de tu academia.
                    </p>
                 </div>

                 <div className="space-y-3">
                    {todasLasAlertas.map((alerta, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand/30 transition-all hover:shadow-xl group">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-50 text-red-500' : 'bg-brand-muted text-brand'}`}>
                            {alerta.motivo === 'Pago Pendiente' ? <Wallet className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                         </div>
                         <div className="flex-1">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{alerta.nombres} {alerta.apellidos}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-100 text-red-700' : 'bg-brand-muted text-brand'}`}>
                                 {alerta.motivo}
                               </span>
                               {alerta.yaNotificado && (
                                 <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-tighter">
                                   <CheckCheck className="w-3 h-3" /> Notificado
                                 </span>
                               )}
                            </div>
                         </div>
                         <button 
                            onClick={() => !alerta.yaNotificado && handleNotificarWhatsApp(alerta)}
                            disabled={enviandoWA === alerta.id || alerta.yaNotificado}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                              alerta.yaNotificado 
                                ? 'bg-slate-50 dark:bg-slate-800 text-emerald-500 cursor-default' 
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                            }`}
                         >
                            {enviandoWA === alerta.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : alerta.yaNotificado ? <CheckCheck className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                 <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest tracking-tighter">
                    Powered by Gibbor Cloud SaaS © 2026
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}