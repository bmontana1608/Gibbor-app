'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { Megaphone, Calendar } from 'lucide-react';

export default function TablonAnuncios({ audiencia }: { audiencia?: string }) {
  const { slug } = useTenant();
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const res = await fetch(`/api/tenant?slug=${slug}`);
      const t = await res.json();

      let query = supabase
        .from('comunicados')
        .select('*')
        .eq('club_id', t.id)
        .eq('estado', 'Activo')
        .order('created_at', { ascending: false })
        .limit(5);

      if (audiencia && audiencia !== 'Todos') {
        // Traer los 'Todos' y los específicos de la audiencia
        query = query.in('audiencia', ['Todos', audiencia]);
      }

      const { data } = await query;
      if (data) setComunicados(data);
      setCargando(false);
    }
    if (slug) cargar();
  }, [slug, audiencia]);

  if (cargando) return <div className="animate-pulse h-20 bg-slate-100 rounded-xl"></div>;
  
  if (comunicados.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-3xl p-6 border border-indigo-100 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-4 border-b border-indigo-100/50 dark:border-slate-800 pb-3">
        <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Tablón de Anuncios</h2>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Comunicados Oficiales</p>
        </div>
      </div>

      <div className="space-y-4">
        {comunicados.map(c => {
          const d = new Date(c.created_at);
          return (
            <div key={c.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{c.titulo}</h3>
                <span className="text-[9px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                  <Calendar className="w-3 h-3" />
                  {d.toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {c.mensaje}
              </p>
              {c.audiencia !== 'Todos' && (
                <span className="mt-3 inline-block px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-md">
                  Para: {c.audiencia}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
