'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Loader2, Image as ImageIcon, MapPin, ExternalLink, CalendarClock } from 'lucide-react';

export default function PublicidadAdminView() {
  const [tab, setTab] = useState<'patrocinadores' | 'flyers'>('patrocinadores');
  const [loading, setLoading] = useState(false);
  const [patrocinadores, setPatrocinadores] = useState<any[]>([]);
  const [flyers, setFlyers] = useState<any[]>([]);

  // Modales
  const [showModalPatrocinador, setShowModalPatrocinador] = useState(false);
  const [showModalFlyer, setShowModalFlyer] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [patroForm, setPatroForm] = useState({ id: '', nombre: '', descripcion: '', telefono: '', sitio_web: '', logo_url: '', pais: '', ciudad: '', activo: true });
  const [flyerForm, setFlyerForm] = useState({ id: '', titulo: '', imagen_url: '', link_url: '', pais: '', ciudad: '', frecuencia_horas: 24, activo: true });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [tab]);

  const cargarDatos = async () => {
    setLoading(true);
    if (tab === 'patrocinadores') {
      const { data } = await supabase.from('patrocinadores').select('*').order('created_at', { ascending: false });
      setPatrocinadores(data || []);
    } else {
      const { data } = await supabase.from('anuncios_flyers').select('*').order('created_at', { ascending: false });
      setFlyers(data || []);
    }
    setLoading(false);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, bucket: 'patrocinadores_logos' | 'flyers') => {
    const file = e.target.files?.[0];
    if (!file) return null;
    
    setUploading(true);
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    
    // Asumimos que los buckets existen o se usan unos genericos. 
    // Usaremos 'recursos_publicos' si no existen los específicos.
    const { data, error } = await supabase.storage.from('recursos_publicos').upload(`${bucket}/${fileName}`, file, { upsert: true });
    
    setUploading(false);
    
    if (error) {
      toast.error('Error subiendo imagen: ' + error.message);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from('recursos_publicos').getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  };

  const guardarPatrocinador = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...patroForm };
    delete payload.id;
    if (!payload.pais) payload.pais = null;
    if (!payload.ciudad) payload.ciudad = null;

    let res;
    if (patroForm.id) {
      res = await supabase.from('patrocinadores').update(payload).eq('id', patroForm.id);
    } else {
      res = await supabase.from('patrocinadores').insert([payload]);
    }

    if (res.error) toast.error(res.error.message);
    else {
      toast.success('Patrocinador guardado');
      setShowModalPatrocinador(false);
      cargarDatos();
    }
    setSaving(false);
  };

  const guardarFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...flyerForm };
    delete payload.id;
    if (!payload.pais) payload.pais = null;
    if (!payload.ciudad) payload.ciudad = null;

    let res;
    if (flyerForm.id) {
      res = await supabase.from('anuncios_flyers').update(payload).eq('id', flyerForm.id);
    } else {
      res = await supabase.from('anuncios_flyers').insert([payload]);
    }

    if (res.error) toast.error(res.error.message);
    else {
      toast.success('Flyer guardado');
      setShowModalFlyer(false);
      cargarDatos();
    }
    setSaving(false);
  };

  const eliminarRegistro = async (tabla: string, id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Registro eliminado');
      cargarDatos();
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Publicidad y Monetización</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona el directorio comercial y anuncios emergentes para directores.</p>
        </div>
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button 
            onClick={() => setTab('patrocinadores')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'patrocinadores' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Directorio Comercial
          </button>
          <button 
            onClick={() => setTab('flyers')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'flyers' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Flyers Pop-ups
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
      ) : tab === 'patrocinadores' ? (
        <div className="space-y-4">
          <button onClick={() => { setPatroForm({ id:'', nombre:'', descripcion:'', telefono:'', sitio_web:'', logo_url:'', pais:'', ciudad:'', activo:true }); setShowModalPatrocinador(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800">
            <Plus size={16} /> Nuevo Patrocinador
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patrocinadores.map(p => (
              <div key={p.id} className={`bg-white rounded-2xl border p-5 flex flex-col ${p.activo ? 'border-slate-200 shadow-sm' : 'border-dashed border-slate-300 opacity-60'}`}>
                <div className="flex justify-between items-start mb-4">
                  {p.logo_url ? <img src={p.logo_url} alt={p.nombre} className="h-12 w-12 rounded-xl object-contain bg-slate-50" /> : <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{p.nombre.charAt(0)}</div>}
                  <div className="flex gap-2">
                    <button onClick={() => { setPatroForm(p); setShowModalPatrocinador(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => eliminarRegistro('patrocinadores', p.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800">{p.nombre}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3 line-clamp-2">{p.descripcion}</p>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {p.ciudad || 'Global'}</span>
                  <span className={p.activo ? 'text-green-500' : 'text-slate-400'}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => { setFlyerForm({ id:'', titulo:'', imagen_url:'', link_url:'', pais:'', ciudad:'', frecuencia_horas:24, activo:true }); setShowModalFlyer(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
            <Plus size={16} /> Nuevo Flyer
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flyers.map(f => (
              <div key={f.id} className={`bg-white rounded-2xl border p-0 overflow-hidden flex flex-col ${f.activo ? 'border-indigo-100 shadow-md ring-1 ring-indigo-50' : 'border-dashed border-slate-300 opacity-60'}`}>
                <div className="aspect-[4/3] bg-slate-100 relative">
                  {f.imagen_url ? <img src={f.imagen_url} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-400"><ImageIcon /></div>}
                  <div className="absolute top-2 right-2 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg">
                    <button onClick={() => { setFlyerForm(f); setShowModalFlyer(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => eliminarRegistro('anuncios_flyers', f.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                  {f.activo && <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Activo</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 line-clamp-1">{f.titulo}</h3>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {f.ciudad || 'Global'}</span>
                    <span className="flex items-center gap-1"><CalendarClock size={12} /> {f.frecuencia_horas}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PATROCINADOR */}
      {showModalPatrocinador && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{patroForm.id ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}</h3>
            <form onSubmit={guardarPatrocinador} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Comercial</label>
                  <input type="text" required value={patroForm.nombre} onChange={e => setPatroForm({...patroForm, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Oferta</label>
                  <textarea rows={2} value={patroForm.descripcion} onChange={e => setPatroForm({...patroForm, descripcion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono (WhatsApp)</label>
                  <input type="text" value={patroForm.telefono} onChange={e => setPatroForm({...patroForm, telefono: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Sitio Web / Link</label>
                  <input type="text" value={patroForm.sitio_web} onChange={e => setPatroForm({...patroForm, sitio_web: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">País Destino (Opcional)</label>
                  <input type="text" placeholder="Ej: Colombia" value={patroForm.pais} onChange={e => setPatroForm({...patroForm, pais: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Ciudad Destino (Opcional)</label>
                  <input type="text" placeholder="Ej: Bogota" value={patroForm.ciudad} onChange={e => setPatroForm({...patroForm, ciudad: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Logo</label>
                  <div className="flex gap-4 items-center">
                    {patroForm.logo_url && <img src={patroForm.logo_url} className="h-16 rounded-xl object-contain bg-slate-50" />}
                    <input type="file" onChange={async (e) => {
                      const url = await handleUploadImage(e, 'patrocinadores_logos');
                      if(url) setPatroForm({...patroForm, logo_url: url});
                    }} className="text-sm" />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="activoPatro" checked={patroForm.activo} onChange={e => setPatroForm({...patroForm, activo: e.target.checked})} />
                  <label htmlFor="activoPatro" className="text-sm font-semibold">Mostrar en el Directorio</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModalPatrocinador(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FLYER */}
      {showModalFlyer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{flyerForm.id ? 'Editar Flyer' : 'Nuevo Flyer'}</h3>
            <form onSubmit={guardarFlyer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Título Interno</label>
                  <input type="text" required value={flyerForm.titulo} onChange={e => setFlyerForm({...flyerForm, titulo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Enlace al hacer clic (Opcional)</label>
                  <input type="text" value={flyerForm.link_url} onChange={e => setFlyerForm({...flyerForm, link_url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" placeholder="https://" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">País Destino</label>
                  <input type="text" placeholder="Global" value={flyerForm.pais} onChange={e => setFlyerForm({...flyerForm, pais: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Ciudad Destino</label>
                  <input type="text" placeholder="Global" value={flyerForm.ciudad} onChange={e => setFlyerForm({...flyerForm, ciudad: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1" />
                </div>
                <div className="col-span-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <label className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1"><CalendarClock size={14}/> Frecuencia de aparición</label>
                  <p className="text-[10px] text-indigo-500 mb-2">¿Cada cuántas horas se le volverá a mostrar este Pop-up al mismo director?</p>
                  <input type="number" required min="1" value={flyerForm.frecuencia_horas} onChange={e => setFlyerForm({...flyerForm, frecuencia_horas: parseInt(e.target.value)})} className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Imagen del Flyer (Vertical recomendado)</label>
                  <div className="flex gap-4 items-center">
                    {flyerForm.imagen_url && <img src={flyerForm.imagen_url} className="h-16 rounded-xl object-cover bg-slate-50" />}
                    <input type="file" onChange={async (e) => {
                      const url = await handleUploadImage(e, 'flyers');
                      if(url) setFlyerForm({...flyerForm, imagen_url: url});
                    }} className="text-sm" />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="activoFlyer" checked={flyerForm.activo} onChange={e => setFlyerForm({...flyerForm, activo: e.target.checked})} />
                  <label htmlFor="activoFlyer" className="text-sm font-semibold">Activar Anuncio</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModalFlyer(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />} Guardar Flyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
