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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header de Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-orange-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Centro de Alto Rendimiento</p>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Instructor <span className="text-orange-500">{perfil?.nombres?.split(' ')[0]}</span></h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Gestión estratégica de talentos en categoría <span className="text-slate-900 font-bold">{perfil?.grupos || 'No asignada'}</span>.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Calendar className="text-orange-500 w-5 h-5" />
          <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Grid de Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link href="/entrenador/asistencia" className="bg-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100 flex flex-col justify-between h-48 group cursor-pointer hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-3 rounded-2xl"><ClipboardCheck className="w-6 h-6" /></div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h3 className="text-xl font-black mb-1">Pasar Asistencia</h3>
            <p className="text-white/80 text-xs">Registra la llegada de tus alumnos hoy.</p>
          </div>
        </Link>

        <Link href="/entrenador/categorias" className="bg-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 flex flex-col justify-between h-48 group cursor-pointer hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-white/10 p-3 rounded-2xl"><Users className="w-6 h-6" /></div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h3 className="text-xl font-black mb-1">Gestionar Alumnos</h3>
            <p className="text-white/60 text-xs">Ver fichas técnicas y contactos.</p>
          </div>
        </Link>

        <Link href="/entrenador/puntos" className="bg-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-100 flex flex-col justify-between h-48 group cursor-pointer hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-3 rounded-2xl"><Trophy className="w-6 h-6" /></div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h3 className="text-xl font-black mb-1">Premios / Puntos</h3>
            <p className="text-white/80 text-xs">Motiva a tus jugadores con puntos.</p>
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
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-2 rounded-lg bg-slate-900 text-orange-500 w-fit mb-3">{item.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-2xl font-black text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Próximas Sesiones (Placeholder visual) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" /> Próximas Sesiones
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex flex-col items-center justify-center text-orange-700">
                <span className="text-xs font-black leading-none">HOY</span>
                <span className="text-[10px] font-bold">4 PM</span>
              </div>
              <div>
                <p className="font-black text-slate-800">Categoría Sub-12</p>
                <p className="text-xs text-slate-500 font-medium italic">Sede Principal - Cancha 1</p>
              </div>
            </div>
            <button className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-md shadow-orange-100">PASAR LISTA</button>
          </div>
          <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                <span className="text-xs font-black leading-none">MAÑ</span>
                <span className="text-[10px] font-bold">8 AM</span>
              </div>
              <div>
                <p className="font-black text-slate-800">Categoría Iniciación</p>
                <p className="text-xs text-slate-500 font-medium italic">Sede Principal - Cancha 2</p>
              </div>
            </div>
            <button className="border border-slate-200 text-slate-400 text-[10px] font-black px-4 py-2 rounded-xl">PENDIENTE</button>
          </div>
        </div>
      </div>

    </div>
  );
}
