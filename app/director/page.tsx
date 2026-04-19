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

export default function DashboardDirector() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
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
  const [config, setConfig] = useState<any>(null);
  const [planesList, setPlanesList] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatosDashboard() {
      setCargando(true);
      
      try {
        const hoy = new Date();
        const inicioHoy = new Date(hoy);
        inicioHoy.setHours(0, 0, 0, 0);

        // CONTABILIDAD MENSUAL: Solo pagos del mes y año en curso
        // El 1 de cada mes todo vuelve a 0 automáticamente
        const mesActual = hoy.getMonth();    // 0-11
        const anioActual = hoy.getFullYear();

        const [
          { data: jugadores, error: errJug },
          { data: planesData },
          { data: pagosMes },
          { data: asistData },
          { data: msgRes }
        ] = await Promise.all([
          supabase.from('perfiles').select('*').eq('rol', 'Futbolista').neq('estado_miembro', 'Pendiente'),
          supabase.from('planes').select('*'),
          supabase.from('pagos_ingresos').select('*'),
          supabase.from('asistencias').select('jugador_id, estado'),
          supabase.from('mensajes_wa').select('destinatario_numero').gte('created_at', inicioHoy.toISOString())
        ]);

        // Números ya notificados hoy
        const notificadosHoy = new Set(msgRes?.map(m => m.destinatario_numero) || []);

        // Guardar config para los recibos
        const { data: configData } = await supabase.from('configuracion_wa').select('*').single();
        if (configData) setConfig(configData);
        if (planesData) setPlanesList(planesData);

        if (errJug) throw errJug;

        if (jugadores) {
          const total = jugadores.length;
          // Filtrar en cliente por mes actual usando startsWith
          // La columna 'fecha' es TEXT con formato 'YYYY-MM-DD' → comparación de strings funciona perfectamente
          const mesPrefijo = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
          
          // Definir pagosFiltrados para usar en conteo e ingresos
          const pagosFiltrados = pagosMes?.filter(p => 
            p.fecha && String(p.fecha).startsWith(mesPrefijo)
          ) || [];

          console.log('📊 Total pagos en BD:', pagosMes?.length, '| Filtrando por:', mesPrefijo);

          const idsPagados = new Set(pagosFiltrados.map((p: any) => p.jugador_id));
          console.log('✅ Alumnos pagados este mes:', idsPagados.size);
          const preciosMap = new Map(planesData?.map(p => [p.nombre, Number(p.precio_base)]) || []);

          let totalProyectado = 0;
          let alDiaCount = 0;
          const morosos: any[] = [];

          jugadores.forEach(j => {
            const precio = preciosMap.get(j.tipo_plan || 'Regular') || 0;
            totalProyectado += precio;
            
            // CONTEO REAL: Solo pago físico registrado O beca legítima
            const tienePago = idsPagados.has(j.id);
            const esBecado = precio === 0;
            // Para excluir de alertas: también consideramos marcado manual
            const marcadoAlDia = j.estado_pago === 'Al día' || esBecado;

            if (tienePago || esBecado) {
              alDiaCount++;
            }

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

          // Tendencia de crecimiento (últimos 6 meses)
          const mesesNombre = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const crecimientoMap: any = {};
          
          // Inicializar últimos 6 meses
          for(let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${mesesNombre[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            crecimientoMap[key] = 0;
          }

          jugadores.forEach(p => {
            const d = new Date(p.created_at);
            const key = `${mesesNombre[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (crecimientoMap.hasOwnProperty(key)) {
              crecimientoMap[key]++;
            }
          });

          const dataGrafico = Object.entries(crecimientoMap).map(([name, total]) => ({ name, total }));

          // Tasa de asistencia por jugador para alertas de deserción
          const alertasBajaAsistencia = jugadores.filter(j => {
            const misAsis = asistData?.filter(a => a.jugador_id === j.id) || [];
            if (misAsis.length < 3) return false; // No hay suficiente data
            const presentes = misAsis.filter(a => a.estado === 'Presente').length;
            return (presentes / misAsis.length) < 0.5; // Menos del 50%
          }).map(j => {
            const numLimpio = String(j.telefono || '').replace(/\D/g, '');
            return { 
              ...j, 
              motivo: 'Baja Asistencia', 
              prioridad: 'Media',
              yaNotificado: notificadosHoy.has(numLimpio) || notificadosHoy.has(`57${numLimpio}`)
            };
          });

          const ingresosReales = pagosFiltrados.reduce((acc: number, current: any) => {
            // El sistema usa 'total' para el monto del recibo
            return acc + (Number(current.total || current.monto || current.monto_base) || 0);
          }, 0);

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

          const fullAlertas = [...morosos, ...alertasBajaAsistencia];
          setTodasLasAlertas(fullAlertas);
          setDataCrecimiento(dataGrafico);
          setAlertas([...morosos.slice(0, 3), ...alertasBajaAsistencia.slice(0, 2)]);
          setActividadReciente(jugadores.slice(0, 5));
          
          // Agrupar para gráfico de barras
          const gMap = jugadores.reduce((acc: any, p) => {
            acc[p.grupos || 'Sin Asignar'] = (acc[p.grupos || 'Sin Asignar'] || 0) + 1;
            return acc;
          }, {});
          setGruposRendimiento(Object.entries(gMap).map(([nombre, cantidad]) => ({ nombre, cantidad: cantidad as number })));
        }
      } catch (error: any) {
        toast.error("Error: " + error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarDatosDashboard();
  }, [router]);

  const [enviandoWA, setEnviandoWA] = useState<string | null>(null);

  const handleNotificarWhatsApp = async (alerta: any) => {
    if (!alerta.telefono) {
      toast.error("El jugador no tiene un teléfono registrado.");
      return;
    }

    setEnviandoWA(alerta.id);
    const nombreFull = `${alerta.nombres} ${alerta.apellidos}`;
    
    let mensaje = "";
    let pdfBase64 = undefined;

    if (alerta.motivo === 'Pago Pendiente') {
      const tarifa = planesList.find(p => p.nombre === (alerta.tipo_plan || 'Regular'))?.precio_base || 140000;
      
      pdfBase64 = await generarReciboPDFBase64({
        nombres: alerta.nombres,
        apellidos: alerta.apellidos,
        documento: alerta.documento,
        grupo: alerta.grupos,
        tarifa: Number(tarifa),
        consecutivo: 'PROV-' + Math.floor(Math.random() * 9000),
        empresa: {
          direccion: config?.direccion || 'Sede Deportiva',
          ciudad: config?.ciudad || 'Cúcuta',
          nequi: config?.nequi,
          daviplata: config?.daviplata,
          banco: config?.banco_nombre ? `${config.banco_nombre}: ${config.banco_numero}` : undefined
        }
      });

      mensaje = `⚽ *GIBBOR APP - Cobro de Mensualidad* \n\nHola *${nombreFull}*, espero que estés muy bien. Te adjuntamos tu recibo de pago pendiente por un valor de *$ ${Number(tarifa).toLocaleString()}*. \n\nRecuerda que tu aporte nos ayuda a seguir creciendo. ¡Nos vemos en el campo! 🏟️`;
    } else {
      mensaje = `⚽ *GIBBOR APP - Alerta de Asistencia* \n\nHola *${nombreFull}*, hemos notado que has faltado a los últimos entrenamientos. \n\n¡Te extrañamos en el campo! Recuerda que la constancia es la clave de un crack. ¡Te esperamos! 💪`;
    }

    const result = await enviarMensajeWhatsApp(
      alerta.telefono, 
      mensaje, 
      pdfBase64, 
      'document', 
      `Recibo_${alerta.nombres}_Pendiente.pdf`
    );
    
    if (result.success) {
      toast.success(`Notificación enviada a ${alerta.nombres}`);
      // Actualizar estado local para feedback inmediato
      setAlertas(prev => prev.map(a => 
        a.id === alerta.id ? { ...a, yaNotificado: true } : a
      ));
    } else {
      toast.error("Error al enviar WhatsApp: " + result.error);
    }
    setEnviandoWA(null);
  };



  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 md:p-8 mb-6 shadow-sm flex justify-between items-center relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1">¡Bienvenido a EFD Gibbor!</h1>
          <p className="text-sm text-slate-400">Gestiona tu establecimiento de forma integral.</p>
        </div>
        <div className="hidden md:block w-32 h-32 bg-orange-500/10 rounded-full absolute -right-10 -top-10 blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/cobranza')}>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Miembros al día en sus pagos</p>
            {cargando ? (
              <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{stats.alDia} <span className="text-sm font-normal text-slate-400">/ {stats.totalMiembros}</span></p>
            )}
            <p className="text-xs text-slate-400 mt-1">{cargando ? '-' : stats.porcentajeAlDia}% de miembros al día</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/categorias')}>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Grupos Activos</p>
            {cargando ? (
              <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{stats.totalGrupos}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Categorías en entrenamiento</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/asistencia')}>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Tasa de Asistencia</p>
            <p className="text-2xl font-bold text-slate-800">{cargando ? '--' : stats.tasaAsistencia} %</p>
            <p className="text-xs text-slate-400 mt-1">Promedio global de asistencia</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Eventos Próximos</p>
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-xs text-slate-400 mt-1">No hay torneos programados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* GRÁFICO DE TENDENCIA (Opción A) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Crecimiento de Atletas</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Histórico últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-orange-600">En ascenso</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            {cargando ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataCrecimiento}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#ea580c" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CENTRO DE ALERTAS INTELIGENTES (Opción B) */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Alertas Inteligentes</h3>
            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">Atención</span>
          </div>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {cargando ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl"></div>)
            ) : alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <ShieldCheck className="w-12 h-12 text-emerald-100 mb-3" />
                <p className="text-sm font-bold text-slate-500">Todo en orden</p>
                <p className="text-[10px] text-slate-400">No se detectan incidentes críticos</p>
              </div>
            ) : (
              alertas.map((alerta, idx) => (
                <div key={idx} className="group p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      {alerta.motivo === 'Pago Pendiente' ? <Wallet className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-[11px] truncate">{alerta.nombres} {alerta.apellidos}</p>
                        {alerta.yaNotificado && (
                           <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Notificado</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{alerta.motivo}</p>
                    </div>
                    <button 
                      onClick={() => !alerta.yaNotificado && handleNotificarWhatsApp(alerta)}
                      disabled={enviandoWA === alerta.id || alerta.yaNotificado}
                      className={`p-2 rounded-lg transition-all shadow-sm ${
                        alerta.yaNotificado 
                          ? 'bg-slate-100 text-blue-500 cursor-default' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                      title={alerta.yaNotificado ? "Ya se envió hoy" : "Notificar por WhatsApp"}
                    >
                      {enviandoWA === alerta.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : alerta.yaNotificado ? (
                        <CheckCheck className="w-3.5 h-3.5" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => setIsAlertsModalOpen(true)}
            className="mt-auto w-full py-2 text-[11px] font-bold text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-dashed border-slate-200"
          >
            Ver todas las alertas ({todasLasAlertas.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* GRÁFICO DE BARRAS DE CATEGORÍAS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Distribución por Categorías</h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 p-4">
            {cargando ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gruposRendimiento} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="nombre" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} 
                    width={100}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} barSize={20}>
                    {gruposRendimiento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ea580c' : '#f97316'} />
                    ))}
                    <LabelList dataKey="cantidad" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ÚLTIMOS REGISTROS (Keep for transactional awareness) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 text-sm">Nuevos Miembros</h3>
            <ArrowUpRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative border-l border-slate-100 ml-3 space-y-6 pb-4">
              {cargando ? (
                 <div className="pl-6 space-y-6 animate-pulse">
                   {[1,2,3].map(i => <div key={i} className="h-4 bg-slate-50 rounded w-3/4"></div>)}
                 </div>
              ) : actividadReciente.map((perfil) => (
                <div key={perfil.id} className="relative pl-6">
                  <div className={`absolute w-2.5 h-2.5 bg-orange-500 rounded-full left-[-5.5px] top-1.5 ring-4 ring-white shadow-sm`}></div>
                  <p className="text-sm font-bold text-slate-700">{perfil.nombres} {perfil.apellidos}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{perfil.grupos || 'Sin asignar'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE GESTIÓN DE TODAS LAS ALERTAS */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
                       <AlertTriangle className="text-white w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">Centro de Alertas</h2>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Incidentes Críticos</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsAlertsModalOpen(false)}
                   className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-6">
                    <p className="text-xs text-orange-700 font-medium leading-relaxed">
                       Tienes <strong>{todasLasAlertas.length} alertas activas</strong> el día de hoy. Gestiona rápidamente los pagos pendientes y la deserción escolar.
                    </p>
                 </div>

                 <div className="space-y-3">
                    {todasLasAlertas.map((alerta, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-orange-200 transition-all hover:shadow-sm">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                            {alerta.motivo === 'Pago Pendiente' ? <Wallet className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                         </div>
                         <div className="flex-1">
                            <h4 className="font-black text-slate-900 text-sm tracking-tight capitalize">{alerta.nombres} {alerta.apellidos}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${alerta.motivo === 'Pago Pendiente' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                 {alerta.motivo}
                               </span>
                               {alerta.yaNotificado && (
                                 <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase">
                                   <CheckCheck className="w-3 h-3" /> Notificado
                                 </span>
                               )}
                            </div>
                         </div>
                         <button 
                            onClick={() => !alerta.yaNotificado && handleNotificarWhatsApp(alerta)}
                            disabled={enviandoWA === alerta.id || alerta.yaNotificado}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              alerta.yaNotificado 
                                ? 'bg-slate-50 text-emerald-500 cursor-default' 
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100'
                            }`}
                         >
                            {enviandoWA === alerta.id ? (
                               <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : alerta.yaNotificado ? (
                               <CheckCheck className="w-4 h-4" />
                            ) : (
                               <MessageSquare className="w-4 h-4" />
                            )}
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                 <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                    Gibbor App Alertas © 2026
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}