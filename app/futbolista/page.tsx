'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Zap, Star, Calendar, 
  TrendingUp, ArrowUpRight, CheckCircle2, 
  AlertCircle, Download, Users
} from "lucide-react";

function RadarChart({ data, size = 300 }: { data: { label: string, value: number }[], size?: number }) {
  if (!data || data.length < 3) return <div className="text-[10px] text-zinc-400">Datos insuficientes</div>;
  
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  
  return (
    <svg viewBox={"0 0 " + size + " " + size} className="w-full h-auto max-w-[200px] mx-auto drop-shadow-2xl z-20 relative">
      {levels.map(l => (
        <polygon 
          key={l}
          points={data.map((_, i) => {
            const r = l * radius;
            const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return (
          <g key={i}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x={x + (x - center) * 0.25} y={y + (y - center) * 0.25} fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{d.label.substring(0,3).toUpperCase()}</text>
          </g>
        );
      })}
      <polygon points={points} fill="rgba(249,115,22,0.3)" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function FifaCard({ perfil, stats }: { perfil: any, stats: any[] }) {
  const media = stats.length > 0 ? Math.round(stats.reduce((acc, curr) => acc + curr.value, 0) / stats.length) : '--';
  
  return (
    <div className="relative w-64 h-96 mx-auto group perspective-1000">
      {/* Brillo de fondo */}
      <div className="absolute inset-0 bg-orange-500/20 blur-[50px] rounded-full group-hover:bg-orange-500/30 transition-all duration-700"></div>
      
      {/* Estructura de la Carta */}
      <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-black rounded-[2rem] border-[3px] border-orange-500/50 p-6 flex flex-col items-center overflow-hidden shadow-2xl transition-transform duration-500 group-hover:rotate-y-12">
        
        {/* Patrón de fondo holográfico */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        {/* Encabezado OVR */}
        <div className="w-full flex justify-between items-start z-10">
          <div className="flex flex-col items-center">
            <span className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-orange-400 leading-none">{media}</span>
            <span className="text-[10px] font-black text-orange-500 tracking-tighter uppercase mt-1">{perfil?.posicion || 'PRO'}</span>
          </div>
          <img src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" alt="Logo" className="w-10 h-auto drop-shadow-lg" />
        </div>

        {/* Foto del Jugador (Placeholder Estético) */}
        <div className="relative w-32 h-32 mt-2 z-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent z-20"></div>
            <Users className="w-20 h-20 text-zinc-700 mb-4" />
        </div>

        {/* Nombre */}
        <div className="z-10 text-center mt-2 w-full border-b border-orange-500/30 pb-2">
          <h3 className="text-xl font-black italic tracking-tighter uppercase text-white truncate px-2">{perfil?.nombres?.split(' ')[0]}</h3>
        </div>

        {/* Stats Cortos (Estilo FIFA) */}
        <div className="z-10 grid grid-cols-2 gap-x-4 gap-y-1 mt-4 w-full">
          {stats.slice(0, 6).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm font-black text-orange-500 italic">{s.value}</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{s.label.substring(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardFutbolista() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [selectedHijoId, setSelectedHijoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [pagos, setPagos] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [asistenciaPct, setAsistenciaPct] = useState(0);

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        let currentPerfilId = session.user.id;
        
        // 1. Cargamos el perfil de quien está logueado
        const { data: myPerfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single();
        
        if (myPerfil?.rol === "Director") {
          // Si es director, buscamos sus hijos en la config
          const { data: config } = await supabase.from("configuracion_wa").select("hijos_config").single();
          
          if (config?.hijos_config) {
            const ids = config.hijos_config.split(",").map((id: string) => id.trim());
            const { data: hijosData, error: errHijos } = await supabase.from("perfiles").select("*").in("id", ids);
            
            if (hijosData && hijosData.length > 0) {
              setHijos(hijosData);
              // Prioridad: 1. El hijo seleccionado manualmente, 2. El primer hijo de la lista
              const firstChildId = hijosData[0].id;
              const targetId = selectedHijoId || firstChildId;
              
              const hijoActivo = hijosData.find(h => h.id === targetId) || hijosData[0];
              setPerfil(hijoActivo);
              currentPerfilId = hijoActivo.id;
              
              if (!selectedHijoId) setSelectedHijoId(firstChildId);
            } else {
              setPerfil(null); // No se encontraron los hijos en perfiles
            }
          } else {
            setPerfil(null); // No hay configuración de hijos
          }
        } else {
          setPerfil(myPerfil);
        }

        // Si tenemos un perfil (ya sea el propio o del hijo), cargamos sus datos deportivos
        if (currentPerfilId) {
          // Fetch Real Pagos
          const { data: pagosBD } = await supabase
             .from("pagos_ingresos")
             .select("*")
             .eq("jugador_id", currentPerfilId)
             .order("fecha", { ascending: false })
             .limit(3);
          if (pagosBD) setPagos(pagosBD);

          // Fetch Asistencias
          const { data: asisData } = await supabase.from("asistencias").select("estado").eq("jugador_id", currentPerfilId);
          if (asisData && asisData.length > 0) {
             const presentes = asisData.filter(a => a.estado === 'Presente').length;
             setAsistenciaPct(Math.round((presentes / asisData.length) * 100));
          } else {
             setAsistenciaPct(0);
          }

          // Fetch Evaluaciones Técnicas para Radar/FifaCard
          const { data: evals } = await supabase.from("evaluaciones_tecnicas")
             .select("stats")
             .eq("jugador_id", currentPerfilId)
             .order("fecha", { ascending: false })
             .limit(1);
          
          if (evals && evals.length > 0 && evals[0].stats) {
             const statsObj = evals[0].stats;
             const newRadar = Object.entries(statsObj).map(([label, value]) => ({
                label,
                value: Number(value)
             }));
             setRadarData(newRadar);
          } else {
             setRadarData([]);
          }
        }
      }
      setCargando(false);
    };
    fetchDatos();
  }, [selectedHijoId]);

  if (cargando) return <div className="animate-pulse space-y-8">
    <div className="h-48 bg-slate-200 rounded-3xl w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-32 bg-slate-200 rounded-2xl"></div>
      <div className="h-32 bg-slate-200 rounded-2xl"></div>
      <div className="h-32 bg-slate-200 rounded-2xl"></div>
    </div>
  </div>;

  if (!perfil) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white rounded-[3rem] border border-dashed border-slate-200 max-w-2xl mx-auto shadow-2xl shadow-slate-100">
       <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <Users className="w-12 h-12 text-orange-500" />
       </div>
       <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Modo Familiar Activo</h2>
       <p className="text-slate-500 font-medium leading-relaxed mb-8">
          Para ver el progreso de tus pequeños cracks, primero debes vincular sus perfiles en la configuración del club.
       </p>
       <button 
         onClick={() => router.push('/director/configuracion')}
         className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-100"
       >
         Configurar Vínculos Ahora
       </button>
    </div>
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* SELECTOR DE PERFIL PARA DIRECTOR-PAPÁ */}
      {hijos.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm inline-flex gap-2">
          {hijos.map(hijo => (
            <button
              key={hijo.id}
              onClick={() => setSelectedHijoId(hijo.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedHijoId === hijo.id || (selectedHijoId === null && hijos[0].id === hijo.id) ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {hijo.nombres.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-orange-500/20">
              <Zap className="w-3.5 h-3.5 fill-orange-400" /> Jugador Élite
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
              ¡HOLA, <span className="text-orange-500">{perfil?.nombres?.split(' ')[0]}!</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-md">
              Tu camino al profesionalismo continúa hoy. Revisa tus metas y prepárate para el próximo entrenamiento en la categoría <span className="text-white font-bold">{perfil?.grupos || 'Sin grupo'}</span>.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center min-w-[120px]">
              <p className="text-orange-500 text-3xl font-black">{perfil?.goles || 0}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Goles</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center min-w-[120px]">
              <p className="text-orange-500 text-3xl font-black">{asistenciaPct}%</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Asistencia</p>
            </div>
          </div>
        </div>
        
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl">
              <Star className="text-orange-500 w-6 h-6 fill-orange-500" />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +2
            </div>
          </div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Puntos Acumulados</h3>
          <p className="text-2xl font-black text-slate-800 mt-1">{perfil?.puntos || 0} pts</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-900 rounded-2xl">
              <Calendar className="text-orange-500 w-6 h-6" />
            </div>
          </div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Próximo Partido</h3>
          <p className="text-2xl font-bold text-slate-800 mt-1">{perfil?.proximo_partido || 'Por definir'}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-900 rounded-2xl">
              <Trophy className="text-orange-500 w-6 h-6" />
            </div>
          </div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tu Ranking</h3>
          <p className="text-2xl font-black text-slate-800 mt-1">{perfil?.ranking ? `#${perfil.ranking}` : '--'} en {perfil?.grupos || 'Cat'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ESTADO DE PAGOS (Dinámico) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3">
            <div className="w-2 h-6 bg-orange-500 rounded-full"></div> Estado de Cuenta
          </h2>
          
          <div className={`p-6 rounded-3xl flex items-center justify-between border ${perfil?.estado_pago === 'Al día' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
            <div className="flex items-center gap-4">
              {perfil?.estado_pago === 'Al día' ? (
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"><CheckCircle2 className="w-7 h-7" /></div>
              ) : (
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20"><AlertCircle className="w-7 h-7" /></div>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mensualidad actual</p>
                <p className="text-xl font-black text-slate-800">{perfil?.estado_pago || 'Pendiente'}</p>
              </div>
            </div>
            {perfil?.estado_pago !== 'Al día' && (
               <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:scale-105 transition-transform">Ver Recibo</button>
            )}
          </div>
          
          <div className="mt-8 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial Reciente</p>
            {pagos.length > 0 ? (
               pagos.map((pago: any) => (
                 <div key={pago.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-white rounded-lg border border-slate-200"><Download className="w-4 h-4 text-slate-400" /></div>
                     <p className="text-sm font-bold text-slate-700">{pago.concepto || 'Abono Mensualidad'}</p>
                   </div>
                   <p className={`text-xs font-bold ${pago.estado === 'Pendiente' ? 'text-amber-600' : 'text-emerald-600'}`}>
                     {pago.estado?.toUpperCase() || 'PAGADO'}
                   </p>
                 </div>
               ))
            ) : (
               <p className="text-xs text-slate-500 font-medium text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">No hay transacciones recientes.</p>
            )}
          </div>
        </div>

        {/* SECCIÓN DE DATOS ÉLITE (GIBBOR STATS LAB) */}
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* IZQUIERDA: GIBBOR PRO CARD */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-500/20">
                <Trophy className="w-3 h-3" /> Technical Profile v2.0
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none">
                TU CARTA <span className="text-orange-500">PRO.</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto lg:mx-0">
                Esta tarjeta se actualiza automáticamente con cada evaluación de tu entrenador. ¡Mejora tus stats en cada entreno!
              </p>
              
              <div className="pt-4 lg:pt-8">
                {radarData.length > 0 ? (
                  <FifaCard perfil={perfil} stats={radarData} />
                ) : (
                  <div className="w-64 h-96 mx-auto bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                    <Zap className="w-12 h-12 text-slate-700 mb-4" />
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sin Carta Activa</p>
                  </div>
                )}
              </div>
            </div>

            {/* DERECHA: RADAR DETALLADO */}
            <div className="bg-white/5 backdrop-blur-sm rounded-[2rem] p-8 border border-white/5 flex flex-col items-center">
              <h3 className="text-white font-black text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-500" /> Atributos Técnicos
              </h3>
              
              {radarData.length > 0 ? (
                 <div className="w-full space-y-8">
                    <RadarChart data={radarData} size={280} />
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      {radarData.map((stat, idx) => (
                        <div key={idx} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</span>
                            <span className="text-xs font-black text-white">{stat.value}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${stat.value}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle className="w-10 h-10 text-orange-500/20 mb-4" />
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pendiente de evaluación</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
