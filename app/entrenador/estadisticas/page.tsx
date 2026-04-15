'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Medal, Star, Target, TrendingUp, 
  Users, Calendar, Filter, Loader, Search,
  Award, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function RankingGibbor() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [recientes, setRecientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'Global' | 'Categoria'>('Global');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catFiltro, setCatFiltro] = useState('');

  useEffect(() => {
    cargarRanking();
    cargarHistorial();
    cargarCategorias();
  }, [filtro, catFiltro]);

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('nombre');
    setCategorias(data || []);
  };

  const cargarRanking = async () => {
    setCargando(true);
    let query = supabase
      .from('perfiles')
      .select('id, nombres, apellidos, puntos, grupos')
      .eq('rol', 'Futbolista')
      .order('puntos', { ascending: false })
      .limit(20);

    if (filtro === 'Categoria' && catFiltro) {
        query = query.ilike('grupos', `%${catFiltro}%`);
    }

    const { data } = await query;
    setRanking(data || []);
    setCargando(false);
  };

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from('puntos_log')
      .select(`
        *,
        perfiles:jugador_id (nombres, apellidos)
      `)
      .order('fecha', { ascending: false })
      .limit(5);
    setRecientes(data || []);
  };

  if (cargando && ranking.length === 0) return <div className="p-20 text-center"><Loader className="animate-spin mx-auto w-10 h-10 text-orange-500" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER DE IMPACTO */}
      <div className="relative bg-slate-900 rounded-[40px] p-8 md:p-12 overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-500/20 to-transparent"></div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Temporada 2024</span>
                    <span className="bg-white/10 text-white/60 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter italic">Live Ranking</span>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2">CUADRO DE <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-8">HONOR</span> 🏆</h1>
                 <p className="text-slate-400 font-medium max-w-md">Reconociendo el talento, la disciplina y el espíritu Gibbor de nuestros futbolistas.</p>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tu Líder de Hoy</p>
                    <p className="text-white font-black text-lg truncate uppercase">{ranking[0]?.nombres} {ranking[0]?.apellidos}</p>
                    <p className="text-orange-500 text-xs font-black">{ranking[0]?.puntos || 0} GIBBOR POINTS</p>
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* TABLA DE POSICIONES (RANKING) */}
         <div className="lg:col-span-2 space-y-6">
            
            <div className="flex items-center justify-between">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                    <button onClick={() => setFiltro('Global')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filtro === 'Global' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>GLOBAL</button>
                    <button onClick={() => setFiltro('Categoria')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filtro === 'Categoria' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>POR CATEGORÍA</button>
                </div>

                {filtro === 'Categoria' && (
                    <select 
                        value={catFiltro} 
                        onChange={(e) => setCatFiltro(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Seleccionar Grupo...</option>
                        {categorias.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                )}
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-6">Posición</th>
                                <th className="p-6">Futbolista</th>
                                <th className="p-6">Categoría</th>
                                <th className="p-6 text-right">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ranking.map((jugador, index) => {
                                const pos = index + 1;
                                return (
                                    <tr key={jugador.id} className={`group hover:bg-orange-50/30 transition-all ${pos <= 3 ? 'bg-slate-50/20' : ''}`}>
                                        <td className="p-6">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                                                pos === 1 ? 'bg-orange-500 text-white rotate-6' : 
                                                pos === 2 ? 'bg-slate-200 text-slate-600' : 
                                                pos === 3 ? 'bg-orange-100 text-orange-600' : 
                                                'bg-white text-slate-400 border border-slate-100'
                                            }`}>
                                                {pos === 1 ? <Medal className="w-5 h-5" /> : pos}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-orange-200 group-hover:text-orange-600 transition-colors">
                                                    {jugador.nombres.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{jugador.nombres} {jugador.apellidos}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{pos === 1 ? '🥇 Campeón del Ranking' : 'Futbolista Gibbor'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase italic">
                                                {jugador.grupos || 'Sin Grupo'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Star className={`w-4 h-4 ${pos === 1 ? 'text-orange-500 fill-orange-500' : 'text-slate-200'}`} />
                                                <span className={`font-black text-xl ${pos === 1 ? 'text-orange-600' : 'text-slate-800'}`}>{jugador.puntos || 0}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {ranking.length === 0 && (
                    <div className="p-20 text-center">
                        <Trophy className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">Aún no hay puntos registrados en esta temporada.</p>
                    </div>
                )}
            </div>
         </div>

         {/* SIDEBAR: ÚLTIMAS ACCIONES / RECIENTES */}
         <div className="space-y-8">
            <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
                 <Zap className="absolute -top-4 -right-4 w-32 h-32 text-orange-500/10 rotate-12 transition-transform group-hover:scale-110" />
                 <h3 className="text-lg font-black mb-6 flex items-center gap-3"><TrendingUp className="text-orange-500 w-5 h-5" /> RECIENTES</h3>
                 
                 <div className="space-y-6">
                    {recientes.map((log) => (
                        <div key={log.id} className="relative pl-6 border-l-2 border-orange-500/30 py-1">
                             <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-slate-900 border-2 border-orange-500"></div>
                             <p className="text-xs font-black text-white/90 uppercase tracking-tight">+{log.puntos} Gibbor Points</p>
                             <p className="text-[10px] text-white/50 font-bold mt-1 uppercase truncate">
                                {log.perfiles?.nombres} • {log.motivo}
                             </p>
                             <p className="text-[9px] text-orange-500/80 font-black mt-1 uppercase tracking-widest italic">{log.otorgado_por || 'Coach'}</p>
                        </div>
                    ))}
                    {recientes.length === 0 && <p className="text-white/30 text-xs font-bold italic">No hay actividad reciente.</p>}
                 </div>

                 <button className="w-full mt-8 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Historial Completo</button>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-[40px] p-8">
                <Award className="w-10 h-10 text-orange-500 mb-4" />
                <h4 className="font-black text-slate-800 text-sm mb-2 uppercase">Lucha por el Top 1</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Solo los atletas con mejor disciplina, asistencia y talento logran entrar en el Salón de la Fama Gibbor. ¡Motiva a tus alumnos!
                </p>
            </div>
         </div>

      </div>

    </div>
  );
}
