'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, ClipboardCheck, Calendar, Trophy, ArrowRight, UserCheck, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardEntrenador() {
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [metricas, setMetricas] = useState({
    alumnosTotal: 0,
    asistenciaMes: 0,
    puntosGenerados: 0
  });

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (usuario) {
        setPerfil(usuario);
        
        // Métricas Reales - Soporte Multi-Categoría
        const categoriasAsignadas = (usuario.grupos || '').split(', ').filter(Boolean);
        
        const queryAlumnos = supabase.from('perfiles').select('id').eq('rol', 'Futbolista');
        
        if (categoriasAsignadas.length > 0) {
          queryAlumnos.in('grupos', categoriasAsignadas);
        } else {
          queryAlumnos.eq('grupos', 'Ninguna');
        }

        const { data: mAlumnos } = await queryAlumnos;
        const { data: mAsistencias } = await supabase.from('asistencias').select('estado').gte('fecha', new Date().toISOString().slice(0, 7) + '-01');
        
        setMetricas({
          alumnosTotal: mAlumnos?.length || 0,
          asistenciaMes: mAsistencias?.length ? Math.round((mAsistencias.filter(a => a.estado === 'Presente').length / mAsistencias.length) * 100) : 0,
          puntosGenerados: 0 // Por implementar sistema de puntos
        });
      }
      setCargando(false);
    }
    cargarDatos();
  }, []);

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando dashboard...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header de Bienvenida - MCM Rebranding */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-cyan-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Ecosistema Master Club Manager</p>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
            Instructor <span className="text-cyan-600">
              {perfil?.nombres?.toLowerCase().includes('nexclub') ? 'Master' : (perfil?.nombres?.split(' ')[0] || 'MCM')}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Gestionando el talento en <span className="text-slate-900 font-black uppercase">{perfil?.grupos || 'Categoría No asignada'}</span>.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Calendar className="text-cyan-600 w-5 h-5" />
          <span className="text-sm font-bold text-slate-700 capitalize">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Grid de Accesos Rápidos - Cianización */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link href="/entrenador/asistencia" className="bg-cyan-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-cyan-900/20 flex flex-col justify-between h-52 group cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="bg-white/20 p-4 rounded-2xl"><ClipboardCheck className="w-7 h-7" /></div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-2 transition-transform" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-1 italic uppercase tracking-tighter text-white">Pasar Asistencia</h3>
            <p className="text-white/80 text-xs font-medium">Control de puntualidad de hoy.</p>
          </div>
        </Link>

        <Link href="/entrenador/categorias" className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col justify-between h-52 group cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden border border-white/5">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10"><Users className="w-7 h-7" /></div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-2 transition-transform" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-1 italic uppercase tracking-tighter text-white">Gestionar Alumnos</h3>
            <p className="text-white/40 text-xs font-medium">Fichas técnicas y contactos.</p>
          </div>
        </Link>

        <Link href="/entrenador/estadisticas" className="bg-white rounded-[2.5rem] p-8 text-slate-800 shadow-xl shadow-slate-200/50 flex flex-col justify-between h-52 group cursor-pointer hover:scale-[1.02] border border-slate-100 transition-all relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="bg-cyan-100 p-4 rounded-2xl text-cyan-600"><Trophy className="w-7 h-7" /></div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-2 transition-all" />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-1 italic uppercase tracking-tighter text-slate-900">Stats Lab</h3>
            <p className="text-slate-400 text-xs font-medium">Análisis de rendimiento grupal.</p>
          </div>
        </Link>

      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Alumnos', value: metricas.alumnosTotal, icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Eficiencia Mes', value: `${metricas.asistenciaMes}%`, icon: <Star className="w-4 h-4" /> },
          { label: 'Puntos Control', value: metricas.puntosGenerados, icon: <Trophy className="w-4 h-4" /> },
          { label: 'Estado Sesión', value: 'Activo', icon: <Calendar className="w-4 h-4" /> },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="p-2.5 rounded-[1rem] bg-slate-50 text-cyan-600 w-fit mb-4">{item.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Sesiones de Entrenamiento del Día (Basado en Categorías Reales) */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 uppercase italic tracking-tighter">
            <Calendar className="w-6 h-6 text-cyan-600" /> Sesiones de Hoy
          </h3>
          <span className="text-[10px] font-black uppercase text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100">Tiempo Real</span>
        </div>
        <div className="divide-y divide-slate-50">
          {perfil?.grupos ? (perfil.grupos.split(', ').filter(Boolean).map((cat: string, index: number) => (
            <div key={index} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-cyan-50 rounded-[1.5rem] flex flex-col items-center justify-center text-cyan-700 border border-cyan-100 shadow-sm transition-transform group-hover:scale-105">
                  <span className="text-xs font-black leading-none">HOY</span>
                  <span className="text-[10px] font-bold mt-1">Sess.</span>
                </div>
                <div>
                  <p className="font-black text-xl text-slate-900 italic uppercase tracking-tighter leading-none mb-1">Categoría {cat}</p>
                  <p className="text-xs text-slate-500 font-medium italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Sede Gibbor FC
                  </p>
                </div>
              </div>
              <Link 
                href="/entrenador/asistencia"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-cyan-900/20 active:scale-95 transition-all uppercase italic tracking-widest"
              >
                Tomar Asistencia
              </Link>
            </div>
          ))) : (
            <div className="p-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Calendar className="text-slate-300 w-8 h-8" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No tienes categorías asignadas para hoy</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
