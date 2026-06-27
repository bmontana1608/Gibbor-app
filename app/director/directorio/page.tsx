'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, MapPin, Globe, Phone, Search, Loader2 } from 'lucide-react';

export default function DirectorioComercialPage() {
  const [patrocinadores, setPatrocinadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  useEffect(() => {
    cargarDirectorio();
  }, []);

  const cargarDirectorio = async () => {
    setLoading(true);
    try {
      // 1. Obtener perfil y club del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase.from('perfiles').select('club_id').eq('id', user.id).single();
      if (!perfil?.club_id) return;

      const { data: club } = await supabase.from('clubes').select('pais, ciudad').eq('id', perfil.club_id).single();
      setTenantInfo(club);

      const clubPais = club?.pais || 'Colombia';
      const clubCiudad = club?.ciudad || 'Bogota';

      // 2. Obtener patrocinadores activos
      const { data: patros } = await supabase
        .from('patrocinadores')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (patros) {
        // 3. Filtrar los que coincidan con la zona (o sean null = globales)
        const patrosFiltrados = patros.filter(p => {
          const paisMatch = !p.pais || p.pais.toLowerCase() === clubPais.toLowerCase();
          const ciudadMatch = !p.ciudad || p.ciudad.toLowerCase() === clubCiudad.toLowerCase();
          return paisMatch && ciudadMatch;
        });
        setPatrocinadores(patrosFiltrados);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filtrados = patrocinadores.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Store className="text-brand w-8 h-8" /> Directorio Comercial
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Encuentra proveedores recomendados de uniformes, implementos deportivos, torneos y servicios para tu academia.
            {tenantInfo?.ciudad && <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-slate-100 rounded-md text-xs font-bold text-slate-600"><MapPin size={12}/> Resultados para {tenantInfo.ciudad}</span>}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar proveedor..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-brand focus:border-brand transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand" />
          <p className="font-bold">Cargando directorio...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Store className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">No hay patrocinadores</h3>
          <p className="text-slate-500 mt-2 max-w-md">
            Por el momento no hay comercios asociados en tu zona. Vuelve pronto para descubrir nuevos proveedores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map(p => (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.nombre} className="w-16 h-16 rounded-2xl object-contain bg-slate-50 border border-slate-100 shadow-sm p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-black text-slate-400 shadow-inner">
                    {p.nombre.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-black text-lg text-slate-800 leading-tight">{p.nombre}</h3>
                  {p.ciudad && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1"><MapPin size={10}/> {p.ciudad}</span>}
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-6 flex-1">{p.descripcion}</p>
              
              <div className="space-y-2 mt-auto">
                {p.telefono && (
                  <a href={`https://wa.me/${p.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors group">
                    <div className="bg-[#25D366] text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Phone size={14} /></div>
                    <span className="font-bold text-sm tracking-tight">{p.telefono}</span>
                  </a>
                )}
                {p.sitio_web && (
                  <a href={p.sitio_web.startsWith('http') ? p.sitio_web : `https://${p.sitio_web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors group">
                    <div className="bg-slate-200 text-slate-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Globe size={14} /></div>
                    <span className="font-bold text-sm tracking-tight truncate">Visitar sitio web</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
