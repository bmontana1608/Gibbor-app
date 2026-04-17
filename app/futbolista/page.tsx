'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Zap, Star, Calendar, 
  TrendingUp, ArrowUpRight, CheckCircle2, 
  AlertCircle, Download, Users, Share2,
  CalendarCheck, Dumbbell, DollarSign,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from 'html-to-image';

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

function FifaCard({ perfil, stats, clubName = 'EFD GIBBOR', season = 'TEMPORADA 2024' }: { perfil: any, stats: any[], clubName?: string, season?: string }) {
  const media = stats.length > 0 ? Math.round(stats.reduce((acc, curr) => acc + curr.value, 0) / stats.length) : '--';
  
  return (
    <div className="relative w-80 h-[550px] mx-auto group">
      <div id="pro-card-capture" className="relative w-full h-full bg-[#1a1a1a] rounded-[3rem] border-4 border-[#FF9900] overflow-hidden flex flex-col p-6 shadow-2xl">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] scale-150 z-0">
           <img src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" className="w-full h-auto grayscale" alt="Watermark" />
        </div>
        <div className="flex justify-between items-start z-20">
           <div className="flex flex-col">
              <span className="text-5xl font-black italic tracking-tighter text-[#FF9900] leading-none drop-shadow-md">
                {media}
              </span>
              <span className="text-[12px] font-black text-[#FF9900] uppercase tracking-wider mt-1">
                {perfil?.posicion || 'PRO'}
              </span>
           </div>
           <img src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" className="w-18 h-auto drop-shadow-lg" alt="Logo" />
        </div>
         <div className="relative flex-grow flex items-center justify-center -mt-8 -mb-4 overflow-visible z-10">
            {perfil?.foto_url ? (
                <img 
                    src={perfil.foto_url} 
                    alt="Player" 
                    className="h-full w-auto object-contain z-0 scale-125 origin-bottom"
                    style={{ 
                      maskImage: 'linear-gradient(to top, transparent, black 15%)',
                      WebkitMaskImage: 'linear-gradient(to top, transparent, black 15%)'
                    }}
                />
            ) : (
                <Users className="w-24 h-24 text-zinc-800" />
            )}
        </div>
        <div className="w-full text-center z-20 py-1">
           <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] leading-none">
             {perfil?.nombres?.split(' ')[0]}
           </h3>
           <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400 mt-1">
             {perfil?.apellidos?.split(' ')[0]}
           </p>
        </div>
        <div className="w-full h-[1px] bg-[#FF9900]/30 my-3 z-20"></div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2 pb-2 z-20">
           {stats.slice(0, 6).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                 <span className="text-xl font-black text-[#FF9900] italic leading-none w-8 text-right italic">
                   {s.value}
                 </span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                   {s.label.substring(0, 3)}
                 </span>
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
  const [radarData, setRadarData] = useState<any[]>([
    { label: 'Ritmo', value: 50 },
    { label: 'Tiro', value: 50 },
    { label: 'Pase', value: 50 },
    { label: 'Regate', value: 50 },
    { label: 'Defensa', value: 50 },
    { label: 'Físico', value: 50 },
  ]);
  const [asistenciaPct, setAsistenciaPct] = useState(0);
  const [activeTab, setActiveTab] = useState<'perfil' | 'disciplina' | 'pagos'>('perfil');
  const [asistenciasLogs, setAsistenciasLogs] = useState<any[]>([]);
  const [insignias, setInsignias] = useState<any[]>([]);
  const [clubConfig, setClubConfig] = useState({ nombre_club: 'EFD GIBBOR', temporada_actual: 'TEMPORADA 2024' });

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Lógica de Selección de Perfil Única
        let currentPerfilId = session.user.id;
        const { data: myPerfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single();
        
        const savedHijoId = typeof window !== 'undefined' ? localStorage.getItem('hijo_seleccionado_id') : null;

        // Si hay un hijo seleccionado en el Modo Familia, lo cargamos vía API Segura
        if (savedHijoId && savedHijoId !== session.user.id) {
          try {
            const res = await fetch(`/api/perfil?id=${savedHijoId}`);
            const targetPerfil = await res.json();
            if (targetPerfil && !targetPerfil.error) {
              setPerfil(targetPerfil);
              currentPerfilId = targetPerfil.id;
            } else {
              setPerfil(myPerfil);
            }
          } catch (err) {
            setPerfil(myPerfil);
          }
        } else {
          // Si no hay selección, mostramos el perfil propio (sea director o futbolista)
          setPerfil(myPerfil);
          currentPerfilId = session.user.id;
        }

        if (currentPerfilId) {
          const { data: pagosBD } = await supabase.from("pagos_ingresos").select("*").eq("jugador_id", currentPerfilId).order("fecha", { ascending: false }).limit(6);
          if (pagosBD) setPagos(pagosBD);

          const { data: asisData } = await supabase.from("asistencias").select("*").eq("jugador_id", currentPerfilId).order("fecha", { ascending: false });
          if (asisData && asisData.length > 0) {
             const presentes = asisData.filter(a => a.estado === 'Presente').length;
             setAsistenciaPct(Math.round((presentes / asisData.length) * 100));
             setAsistenciasLogs(asisData);
          }

          // Cargar Evaluaciones Técnicas (Carta PRO) vía API Segura
          try {
            const resEval = await fetch(`/api/evaluaciones?jugador_id=${currentPerfilId}`);
            const evalData = await resEval.json();
            if (evalData && evalData.stats) {
              setRadarData(Object.entries(evalData.stats).map(([label, value]) => ({ label, value: Number(value) })));
            }
          } catch (err) {
            console.error("Error cargando carta PRO:", err);
          }

          const { data: insigData } = await supabase.from("insignias_otorgadas").select("insignia_id, insignias(*)").eq("jugador_id", currentPerfilId);
          if (insigData) setInsignias(insigData.map(i => i.insignias));

          const { data: cfg } = await supabase.from('configuracion_wa').select('nombre_club, temporada_actual').single();
          if (cfg) setClubConfig(cfg);
        }
      }
      setCargando(false);
    };
    fetchDatos();
  }, [selectedHijoId]);
  
  const handleExportCard = async () => {
    const node = document.getElementById('pro-card-capture');
    if (!node) return;
    const toastId = toast.loading("Forjando tu Carta PRO...");
    try {
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2, backgroundColor: '#09090b' });
      const link = document.createElement('a');
      link.download = `Gibbor_PRO_${perfil?.nombres?.split(' ')[0]}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("¡Carta descargada con éxito! Muéstrala a tus amigos", { id: toastId });
    } catch (err) {
      toast.error("Error al forjar tu carta", { id: toastId });
    }
  };

  if (cargando) return <div className="animate-pulse p-8 space-y-8"><div className="h-48 bg-slate-200 rounded-3xl"></div></div>;

  if (!perfil) return <div className="p-8 text-center text-slate-500">Perfil no encontrado</div>;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      {/* SELECTOR */}
      {hijos.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm inline-flex gap-2">
          {hijos.map(hijo => (
            <button key={hijo.id} onClick={() => setSelectedHijoId(hijo.id)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedHijoId === hijo.id ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>{hijo.nombres.split(' ')[0]}</button>
          ))}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-orange-500/20"><Zap className="w-3.5 h-3.5 fill-orange-400" /> Jugador Élite</div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">¡HOLA, <span className="text-orange-500">{perfil?.nombres?.split(' ')[0]}!</span></h1>
            <p className="text-slate-400 font-medium max-w-md">Tu camino al profesionalismo continúa hoy en la categoría <span className="text-white font-bold">{perfil?.grupos || 'Sin grupo'}</span>.</p>
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
      </div>

      {/* NAVEGACIÓN TIPO APP (TABS) */}
      <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 sticky top-4 z-50">
        <button 
          onClick={() => setActiveTab('perfil')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Perfil
        </button>
        <button 
          onClick={() => setActiveTab('disciplina')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'disciplina' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <CalendarCheck className="w-4 h-4" /> Disciplina
        </button>
        <button 
          onClick={() => setActiveTab('pagos')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pagos' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <DollarSign className="w-4 h-4" /> Pagos
        </button>
      </div>

      {/* RENDERIZADO DINÁMICO SEGÚN PESTAÑA */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {activeTab === 'perfil' && (
          <div className="space-y-10">
            <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                  <div>
                    <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Technical Profile v2.0</span>
                    <h2 className="text-4xl font-black text-white tracking-tighter text-5xl">TU CARTA <span className="text-orange-500">PRO.</span></h2>
                  </div>
                </div>
                {radarData.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                    <div className="flex flex-col items-center gap-6">
                      <FifaCard 
                        perfil={perfil} 
                        stats={radarData} 
                        clubName={clubConfig.nombre_club} 
                        season={clubConfig.temporada_actual} 
                      />
                      <button 
                        onClick={handleExportCard} 
                        className="group relative bg-gradient-to-br from-orange-400 to-orange-600 text-white px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden"
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform"></div>
                        <Download className="w-4 h-4" /> 
                        <span>Descargar Carta</span>
                      </button>
                    </div>
                    <div className="flex flex-col items-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 text-center uppercase">ADN Técnico Gibbor</h4>
                      <RadarChart data={radarData} size={320} />
                    </div>
                    <div className="flex flex-col gap-4">
                      {radarData.map((stat, idx) => (
                        <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-xs font-black text-white">{stat.value}%</span>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${stat.value}%` }}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-500 font-bold uppercase tracking-widest">Esperando evaluación técnica...</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Puntos Acumulados</h3><p className="text-2xl font-black text-slate-800 mt-1">{perfil?.puntos || 0} pts</p></div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Próximo Partido</h3><p className="text-2xl font-bold text-slate-800 mt-1">{perfil?.proximo_partido || 'Por definir'}</p></div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tu Ranking</h3><p className="text-2xl font-black text-slate-800 mt-1">{perfil?.ranking || '--'} en Cat</p></div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h2 className="text-lg font-black text-slate-800 uppercase mb-8 flex items-center gap-3"><div className="w-2 h-6 bg-orange-500 rounded-full"></div> Vitrina</h2>
               {insignias.length > 0 ? (
                  <div className="flex flex-wrap gap-8 justify-center">
                    {insignias.map((insig, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-3 group">
                        <div className="w-20 h-20 relative">
                          <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl group-hover:bg-yellow-400/40 transition-all scale-0 group-hover:scale-110"></div>
                          <img src={insig.icono_url} alt={insig.nombre} className="w-full h-full object-contain relative z-10 drop-shadow-lg scale-90 group-hover:scale-100 transition-transform" />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter text-center max-w-[80px] leading-tight">{insig.nombre}</span>
                      </div>
                    ))}
                  </div>
               ) : (
                  <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-3xl">Gana insignias en tus entrenamientos</div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'disciplina' && (
          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-200 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Bitácora de <span className="text-orange-500">Disciplina</span></h2>
                <p className="text-slate-500 font-medium">Historial detallado de entrenamientos y partidos.</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tu Promedio</p>
                  <p className={`text-2xl font-black ${asistenciaPct >= 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{asistenciaPct}%</p>
                </div>
                <div className={`w-12 h-12 rounded-full border-4 ${asistenciaPct >= 80 ? 'border-emerald-500' : 'border-orange-500'} flex items-center justify-center`}>
                  <CalendarCheck className={asistenciaPct >= 80 ? 'text-emerald-500' : 'text-orange-500'} />
                </div>
              </div>
            </div>

            {asistenciasLogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {asistenciasLogs.slice(0, 12).map((log, idx) => (
                  <div key={idx} className={`p-5 rounded-[2rem] border transition-all ${log.estado === 'Presente' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${log.estado === 'Presente' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {log.estado}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(log.fecha).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${log.estado === 'Presente' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.tipo_sesion === 'Partido' ? <Trophy className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none">{log.tipo_sesion || 'Entrenamiento'}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">EFD GIBBOR</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300"><Calendar className="w-8 h-8" /></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aún no hay registros de asistencia.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pagos' && (
          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-300">
             <div className="mb-10 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión <span className="text-orange-500">Financiera</span></h2>
                  <p className="text-slate-500 font-medium">Estado de mensualidades y uniformes.</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${perfil?.estado_pago === 'Al día' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                  {perfil?.estado_pago || 'Pendiente'}
                </div>
             </div>
             {pagos.length > 0 ? (
               <div className="space-y-4">
                 {pagos.map((pago: any) => (
                   <div key={pago.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-orange-200">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-orange-500"><Zap className="w-6 h-6" /></div>
                       <div>
                         <p className="text-sm font-black text-slate-800">{pago.concepto || 'Mensualidad EFD'}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{new Date(pago.fecha).toLocaleDateString()}</p>
                       </div>
                     </div>
                     <div className="text-right flex flex-col items-end gap-2">
                       <p className="text-lg font-black text-slate-800 leading-none lg:mb-1">$ {(pago.monto || pago.total || 0).toLocaleString()}</p>
                       <div className="flex items-center gap-2">
                          {pago.recibo_url && (
                             <a 
                               href={pago.recibo_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-200 transition-colors"
                             >
                               <FileText className="w-3 h-3" /> Recibo
                             </a>
                          )}
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Verificado</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-400 font-bold uppercase tracking-widest text-sm">No hay reportes de pago recientes.</div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
