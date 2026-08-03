'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import Link from 'next/link';
import { Play, Calendar, ShieldCheck } from 'lucide-react';

export default function PartidosList() {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [partidos, setPartidos] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!tenantSlug) return;
      const { data: t } = await supabase.from('clubes').select('*').eq('slug', tenantSlug).single();
      setTenant(t);

      const { data } = await supabase.from('eventos').select('*').eq('club_id', t.id).eq('tipo', 'Partido').order('fecha', { ascending: false });
      if (data) setPartidos(data);
    }
    load();
  }, [tenantSlug]);

  const brandColor = tenant?.config?.color || '#06b6d4';
  
  const [isSubdomain, setIsSubdomain] = useState(false);
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    if (host.startsWith(`${tenantSlug}.`)) {
      setIsSubdomain(true);
    }
  }, [tenantSlug]);
  const basePath = isSubdomain || !tenantSlug || tenantSlug === 'master' ? '' : `/${tenantSlug}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
          <Play className="w-8 h-8" style={{ color: brandColor }} />
          Transmisiones en Vivo
        </h1>
        <p className="text-slate-500 font-medium">Selecciona un partido para iniciar la transmisión del minuto a minuto.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partidos.map(p => (
          <div key={p.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
            <div>
              <span className="text-[10px] font-black uppercase text-white px-2 py-1 rounded mb-2 inline-block" style={{ backgroundColor: brandColor }}>{p.estado_partido || 'No Iniciado'}</span>
              <h3 className="text-xl font-black italic uppercase text-slate-800 mb-1">{p.titulo}</h3>
              <p className="text-sm font-bold text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4"/> {new Date(p.fecha).toLocaleDateString()}</p>
            </div>
            <Link 
              href={`${basePath}/entrenador/partidos/${p.id}`}
              className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
            >
              <Play className="w-6 h-6 ml-1" style={{ color: brandColor }} />
            </Link>
          </div>
        ))}
        {partidos.length === 0 && (
          <p className="text-slate-400 font-bold p-8 text-center col-span-2">No hay partidos registrados. Ve a Convocatorias para crear uno.</p>
        )}
      </div>
    </div>
  );
}
