'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Zap, Star, Calendar, 
  Download, Users,
  CalendarCheck, Dumbbell, DollarSign,
  FileText, Target, Shield, Award, Heart
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

function RadarChart({ data, size = 300, color = '#f97316' }: { data: { label: string, value: number }[], size?: number, color?: string }) {
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
        const offsetX = Math.cos(i * angleStep - Math.PI / 2) * 35;
        const offsetY = Math.sin(i * angleStep - Math.PI / 2) * 25;
        return (
          <g key={i}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text 
              x={x + offsetX} 
              y={y + offsetY} 
              fill="rgba(255,255,255,0.8)" 
              fontSize="14" 
              fontWeight="900" 
              textAnchor="middle" 
              alignmentBaseline="middle"
              className="tracking-tighter uppercase italic"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      <polygon points={points} fill={`${color}4d`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function FifaCard({ perfil, stats, clubName = 'CLUB', clubLogo = '/logo.png', color = '#FF9900' }: { perfil: any, stats: any[], clubName?: string, clubLogo?: string, color?: string }) {
  const media = stats.length > 0 ? Math.round(stats.reduce((acc, curr) => acc + curr.value, 0) / stats.length) : '--';
  
  return (
    <div className="relative w-80 h-[550px] mx-auto group">
      <div id="pro-card-capture" className="relative w-full h-full bg-[#1a1a1a] rounded-[3rem] border-4 overflow-hidden flex flex-col p-6 shadow-2xl" style={{ borderColor: color }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] scale-150 z-0">
           <img src={clubLogo} className="w-full h-auto grayscale" alt="Watermark" />
        </div>
        <div className="flex justify-between items-start z-20">
           <div className="flex flex-col">
              <span className="text-5xl font-black italic tracking-tighter leading-none drop-shadow-md" style={{ color: color }}>
                {media}
              </span>
              <span className="text-[12px] font-black uppercase tracking-wider mt-1" style={{ color: color }}>
                {perfil?.posicion || 'PRO'}
              </span>
           </div>
           <img src={clubLogo} className="w-16 h-16 object-contain drop-shadow-lg" alt="Logo" />
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
        <div className="w-full h-[1px] my-3 z-20" style={{ backgroundColor: `${color}4d` }}></div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2 pb-2 z-20">
           {stats.slice(0, 6).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                 <span className="text-xl font-black italic leading-none w-8 text-right italic" style={{ color: color }}>
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
  const [tenant, setTenant] = useState<any>(null);
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
  const [eventos, setEventos] = useState<any[]>([]);

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setCargando(false);

      try {
        // Cargar Tenant
        const resT = await fetch('/api/tenant');
        const tenantData = await resT.json();
        if (tenantData) setTenant(tenantData);

        const cleanEmail = session.user.email?.trim().replace(/\.+@/g, '@').replace(/\.+$/,'');
        const resFam = await fetch(`/api/familia?email=${cleanEmail}&uid=${session.user.id}`, { cache: 'no-store' });
        const misPerfiles = await resFam.json();
        
        let currentPerfilId = session.user.id;

        if (Array.isArray(misPerfiles) && misPerfiles.length > 0) {
          setHijos(misPerfiles.filter((p:any) => p.id !== session.user.id || (p.rol !== "Director" && p.rol !== "Entrenador")));
          const savedHijoId = localStorage.getItem('hijo_seleccionado_id');
          const esValido = misPerfiles.some((p: any) => p.id === savedHijoId);
          if (savedHijoId && esValido && savedHijoId !== session.user.id) {
            currentPerfilId = savedHijoId;
          } else {
            const miPerfil = misPerfiles.find((p:any) => p.id === session.user.id);
            if ((miPerfil?.rol === 'Director' || miPerfil?.rol === 'Entrenador') && misPerfiles.length > 1) {
              const primerHijo = misPerfiles.find((p:any) => p.rol !== 'Director' && p.rol !== 'Entrenador');
              if (primerHijo) currentPerfilId = primerHijo.id;
            }
          }
        }
        
        setSelectedHijoId(currentPerfilId);
        const resDash = await fetch(`/api/dashboard/futbolista?id=${currentPerfilId}`).then(r => r.json());

        if (resDash && !resDash.error) {
          setPerfil(resDash.perfil);
          const colMap: any = { goleador: 'from-orange-500 to-red-500', muro: 'from-blue-500 to-indigo-700', cerebro: 'from-purple-500 to-pink-600', fairplay: 'from-green-400 to-emerald-600', rayo: 'from-yellow-400 to-orange-500' };
          setInsignias((resDash.perfil?.insignias || []).map((i: any) => ({ ...i.insignias, slug: i.insignia_id, color: colMap[i.insignia_id] || 'from-slate-700 to-slate-800' })));
          setRadarData(Object.entries(resDash.stats || {}).map(([label, value]) => ({ label, value: Number(value) })));
          setPagos(resDash.pagos || []);
          setAsistenciaPct(resDash.asistenciaPct || 0);
          setAsistenciasLogs(resDash.asistencias || []);
          setEventos(resDash.eventos || []);
        }

      } catch (err) {
        console.error("Error en carga de dashboard:", err);
      } finally {
        setCargando(false);
      }
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
      link.download = `${tenant?.nombre || 'Club'}_PRO_${perfil?.nombres?.split(' ')[0]}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("¡Carta descargada con éxito!", { id: toastId });
    } catch (err) {
      toast.error("Error al forjar tu carta", { id: toastId });
    }
  };

  const handleVerRecibo = async (pago: any) => {
    const toastId = toast.loading("Generando tu recibo oficial...");
    try {
      const doc = new jsPDF();
      const clubName = tenant?.nombre || 'MCM CLUB';
      const clubLogo = tenant?.logo_url || '/logo.png';
      const brandColor = tenant?.color_primario || '#ea580c';
      
      try {
        doc.addImage(clubLogo, 'PNG', 15, 10, 20, 20);
      } catch (e) {
        console.warn("No se pudo cargar el logo en el PDF");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(brandColor);
      doc.text(clubName.toUpperCase(), 40, 20);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(clubName, 40, 25);
      doc.text('Documento Digital de Soporte', 40, 29);

      doc.setDrawColor(240, 240, 240);
      doc.line(15, 35, 195, 35);

      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text('DETALLES DEL RECIBO', 15, 45);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text(`Recibo № ${String(pago.consecutivo || '000').padStart(4, '0')}`, 195, 45, { align: 'right' });

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 50, 180, 40, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('ALUMNO:', 20, 60);
      doc.text('FECHA:', 20, 70);
      doc.text('MÉTODO:', 20, 80);
      doc.text('CONCEPTO:', 100, 70);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`${perfil.nombres} ${perfil.apellidos}`.toUpperCase(), 40, 60);
      doc.text(new Date(pago.fecha).toLocaleDateString(), 40, 70);
      doc.text(pago.metodo_pago || 'Electrónico', 40, 80);
      doc.text(pago.concepto || 'Mensualidad', 125, 70);

      doc.setFillColor(30, 41, 59);
      doc.rect(15, 100, 180, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('DESCRIPCIÓN', 20, 106.5);
      doc.text('TOTAL', 185, 106.5, { align: 'right' });

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.text('Aporte Mensual Formación Deportiva', 20, 120);
      doc.setFont("helvetica", "bold");
      doc.text(`$ ${Number(pago.total || 0).toLocaleString()}`, 185, 120, { align: 'right' });
      
      doc.line(15, 125, 195, 125);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Este es un comprobante oficial generado por ${clubName}.`, 105, 150, { align: 'center' });

      doc.save(`Recibo_${tenant?.slug || 'club'}_${pago.consecutivo || 'pago'}.pdf`);
      toast.success("Recibo generado correctamente", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el recibo", { id: toastId });
    }
  };

  if (cargando) return (
    <div className="space-y-10 max-w-6xl mx-auto animate-pulse">
      <div className="h-64 bg-slate-200 rounded-[2.5rem]"></div>
      <div className="h-16 bg-slate-100 rounded-2xl w-3/4 mx-auto"></div>
    </div>
  );

  const brandColor = tenant?.color_primario || '#ea580c';
  const brandName = tenant?.nombre || 'Club';

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      {/* SELECTOR */}
      {hijos.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm inline-flex gap-2">
          {hijos.map(hijo => (
            <button 
                key={hijo.id} 
                onClick={() => setSelectedHijoId(hijo.id)} 
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedHijoId === hijo.id ? 'text-white shadow-lg' : 'text-slate-400'}`}
                style={selectedHijoId === hijo.id ? { backgroundColor: brandColor } : {}}
            >
                {hijo.nombres.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border" style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}>
                <Zap className="w-3.5 h-3.5" /> Jugador Élite
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                ¡HOLA, <span style={{ color: brandColor }}>{perfil?.nombres?.split(' ')[0]}!</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-md">Tu camino al profesionalismo continúa hoy en la categoría <span className="text-white font-bold">{perfil?.grupos || 'Sin grupo'}</span>.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center min-w-[120px]">
              <p className="text-3xl font-black" style={{ color: brandColor }}>{perfil?.goles || 0}</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Goles</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center min-w-[120px]">
              <p className="text-3xl font-black" style={{ color: brandColor }}>{asistenciaPct}%</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Asistencia</p>
            </div>
          </div>
        </div>
      </div>

      {/* AGENDA */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-3">
          <Calendar className="w-5 h-5" style={{ color: brandColor }} /> Agenda del Club
        </h2>
        {eventos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {eventos.map((evento) => (
              <div key={evento.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest`} style={{ backgroundColor: brandColor, color: 'white' }}>
                    {evento.tipo}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-800 leading-none">{new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 leading-tight uppercase">{evento.titulo}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-2">
                    <Zap className="w-3 h-3" style={{ color: brandColor }} /> 
                    {(() => {
                      const [h, m] = evento.hora.split(':');
                      let hour = parseInt(h);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      hour = hour % 12 || 12;
                      return `${hour}:${m} ${ampm}`;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No hay eventos programados</p>
          </div>
        )}
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 sticky top-4 z-50 shadow-lg">
        <button onClick={() => setActiveTab('perfil')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'text-white shadow-lg' : 'text-slate-400'}`} style={activeTab === 'perfil' ? { backgroundColor: brandColor } : {}}><Users className="w-4 h-4" /> Perfil</button>
        <button onClick={() => setActiveTab('disciplina')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'disciplina' ? 'text-white shadow-lg' : 'text-slate-400'}`} style={activeTab === 'disciplina' ? { backgroundColor: brandColor } : {}}><CalendarCheck className="w-4 h-4" /> Disciplina</button>
        <button onClick={() => setActiveTab('pagos')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pagos' ? 'text-white shadow-lg' : 'text-slate-400'}`} style={activeTab === 'pagos' ? { backgroundColor: brandColor } : {}}><DollarSign className="w-4 h-4" /> Pagos</button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'perfil' && (
          <div className="space-y-10">
            <div className="bg-slate-900 rounded-[3rem] px-4 py-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] -mr-48 -mt-48" style={{ backgroundColor: `${brandColor}20` }}></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                  <div>
                    <span className="text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block" style={{ backgroundColor: brandColor }}>Technical Profile</span>
                    <h2 className="text-4xl font-black text-white tracking-tighter md:text-5xl">TU CARTA <span style={{ color: brandColor }}>PRO.</span></h2>
                  </div>
                </div>
                {radarData.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center justify-items-center">
                    <div className="flex flex-col items-center justify-center gap-8 w-full">
                      <FifaCard perfil={perfil} stats={radarData} clubName={brandName} clubLogo={tenant?.logo_url} color={brandColor} />
                      <button onClick={handleExportCard} className="group relative text-white px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden" style={{ backgroundColor: brandColor }}>
                        <Download className="w-4 h-4" /> <span>Descargar Carta</span>
                      </button>
                    </div>
                    <div className="flex flex-col items-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 text-center">ADN TÉCNICO {brandName}</h4>
                      <RadarChart data={radarData} size={320} color={brandColor} />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 w-full">
                      {radarData.map((stat, idx) => (
                        <div key={idx} className="bg-white/5 p-3 md:p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-xs font-black text-white">{stat.value}%</span>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5"><div className="h-full rounded-full" style={{ width: `${stat.value}%`, backgroundColor: brandColor }}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-500 font-bold uppercase tracking-widest">Esperando evaluación técnica...</div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h2 className="text-lg font-black text-slate-800 uppercase mb-8 flex items-center gap-3"><div className="w-2 h-6 rounded-full" style={{ backgroundColor: brandColor }}></div> Vitrina de Trofeos</h2>
               {insignias.length > 0 ? (
                  <div className="flex flex-wrap gap-8 justify-center">
                    {insignias.map((insig: any, idx) => {
                      const icons: Record<string, any> = { goleador: Target, muro: Shield, cerebro: Zap, fairplay: Heart, rayo: Zap };
                      const IconComponent = icons[insig.slug || insig.id] || Award;
                      return (
                        <div key={idx} className="flex flex-col items-center gap-4 group">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <div className={`relative z-10 w-20 h-20 rounded-[2rem] bg-gradient-to-br ${insig.color} flex items-center justify-center shadow-xl border border-white/20 group-hover:scale-110 transition-all`}>
                               <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />
                            </div>
                          </div>
                          <p className="text-slate-800 font-black text-[11px] uppercase tracking-tighter text-center">{insig.nombre}</p>
                        </div>
                      );
                    })}
                  </div>
               ) : (
                  <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Gana insignias en tus entrenamientos</div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'disciplina' && (
          <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-xl">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-8">Bitácora de <span style={{ color: brandColor }}>Disciplina</span></h2>
            {asistenciasLogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {asistenciasLogs.slice(0, 12).map((log, idx) => (
                  <div key={idx} className={`p-5 rounded-[2rem] border ${log.estado === 'Presente' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${log.estado === 'Presente' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{log.estado}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(log.fecha).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 leading-none">{log.tipo_sesion || 'Entrenamiento'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest">Sin registros de asistencia</div>
            )}
          </div>
        )}

        {activeTab === 'pagos' && (
          <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-xl">
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-8">Gestión <span style={{ color: brandColor }}>Financiera</span></h2>
             {pagos.length > 0 ? (
               <div className="space-y-4">
                 {pagos.map((pago: any) => (
                   <div key={pago.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm" style={{ color: brandColor }}><DollarSign className="w-6 h-6" /></div>
                       <div><p className="text-sm font-black text-slate-800">{pago.concepto || 'Mensualidad'}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(pago.fecha).toLocaleDateString()}</p></div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black text-slate-800">$ {(pago.monto || pago.total || 0).toLocaleString()}</p>
                        <button onClick={() => handleVerRecibo(pago)} className="text-[10px] font-black uppercase text-emerald-600 mt-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Ver Recibo</button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Sin reportes de pago recientes</div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
