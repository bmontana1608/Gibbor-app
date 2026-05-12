'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Save, Trash2, Pause, Play, FileText, Trophy, Hospital, Users, Phone, Loader, AlertCircle, Wallet, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useTenant } from '@/lib/hooks/useTenant';

export default function FichaDelJugador() {
  const params = useParams();
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();
  
  const [jugador, setJugador] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  
  const [edicion, setEdicion] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [todosLosJugadores, setTodosLosJugadores] = useState<any[]>([]);

  useEffect(() => {
    async function cargarJugador() {
      if (!params?.id || params.id === 'nuevo') {
        setCargando(false);
        return;
      }

      const tenantRes = await fetch('/api/tenant?slug=' + tenantSlug, { cache: 'no-store' });
      const tenantData = await tenantRes.json();

      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', params.id)
        .eq('club_id', tenantData.id)
        .maybeSingle(); 

      if (error) {
        toast.error('Error al cargar datos: ' + error.message);
      } else if (data) {
        setJugador(data);
        setFormData(data); 

        const { data: categoriasBD } = await supabase.from('categorias')
          .select('nombre')
          .eq('club_id', data.club_id)
          .eq('estado', 'Activo');
        if (categoriasBD) setCategorias(categoriasBD);

        const { data: planesBD } = await supabase.from('planes')
          .select('nombre, precio_base')
          .eq('club_id', data.club_id)
          .order('precio_base', { ascending: true });
        if (planesBD) setPlanes(planesBD);

        const { data: pagosBD } = await supabase
          .from('pagos_ingresos')
          .select('*')
          .eq('jugador_id', params.id)
          .eq('club_id', data.club_id)
          .order('fecha', { ascending: false });
        if (pagosBD) setPagos(pagosBD);

        const { data: todosJugadoresBD } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos, grupos')
          .eq('club_id', data.club_id)
          .eq('rol', 'Futbolista')
          .eq('estado_miembro', 'Activo')
          .order('nombres', { ascending: true });
        if (todosJugadoresBD) setTodosLosJugadores(todosJugadoresBD);
      }
      setCargando(false);
    }
    cargarJugador();
  }, [params]);

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading("Guardando...");

    const { error } = await supabase
      .from('perfiles')
      .update(formData)
      .eq('id', jugador.id);

    if (error) {
      toast.error("Error al actualizar: " + error.message, { id: toastId });
    } else {
      setJugador(formData); 
      setEdicion(false);    
      toast.success("Datos actualizados.", { id: toastId });
    }
    setGuardando(false);
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setSubiendoFoto(true);
      
      const tenantRes = await fetch('/api/tenant?slug=' + tenantSlug, { cache: 'no-store' });
      const tenantData = await tenantRes.json();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${tenantData.id}/avatares/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath);
      setFormData({ ...formData, foto_url: data.publicUrl });
      toast.success('Foto subida. No olvides guardar.');
    } catch (err: any) {
      toast.error('Error al subir: ' + err.message);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!window.confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
    const { error } = await supabase.from('perfiles').update({ estado_miembro: nuevoEstado }).eq('id', jugador.id);
    if (!error) {
      setJugador({ ...jugador, estado_miembro: nuevoEstado });
      toast.success(`Jugador ${nuevoEstado}`);
    }
  };

  const eliminarJugador = async () => {
    if (!window.confirm(`¿ELIMINAR PERFIL?`)) return;
    const { error } = await supabase.from('perfiles').delete().eq('id', jugador.id);
    if (!error) {
      toast.success("Eliminado");
      router.push(route('/director/miembros'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  if (cargando) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500"><Loader className="w-8 h-8 animate-spin" /><p>Cargando...</p></div>;
  if (!jugador) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-red-500"><AlertCircle className="w-10 h-10" /><p>No encontrado.</p></div>;

  const esAlDia = (jugador.estado_pago || '').trim().toLowerCase() === 'al día';

  if (edicion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Edit className="w-6 h-6" /> Editando a {jugador.nombres}</h1>
            <button onClick={() => setEdicion(false)} className="text-slate-500 font-bold">✕ Cancelar</button>
          </div>
          <form onSubmit={handleGuardarEdicion} className="bg-white rounded-2xl p-6 md:p-8 space-y-8 border shadow-sm">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Datos Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Nombres</label><input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" required/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Apellidos</label><input type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" required/></div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Foto de Perfil</label>
                  <div className="flex gap-4 items-center">
                    <label className="cursor-pointer bg-slate-100 border p-2 rounded-lg text-xs font-bold flex items-center gap-2">
                      <Upload className="w-4 h-4" /> {subiendoFoto ? "Subiendo..." : "Subir Foto"}
                      <input type="file" accept="image/*" onChange={handleSubirFoto} className="hidden" disabled={subiendoFoto} />
                    </label>
                    <input type="text" name="foto_url" value={formData.foto_url || ''} onChange={handleChange} placeholder="URL de la foto..." className="flex-1 px-3 py-2 border rounded-lg text-sm"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setEdicion(false)} className="px-6 py-2 border rounded-xl text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={guardando} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm">{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <button onClick={() => router.back()} className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm border mb-8 relative">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${jugador.estado_miembro === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl border overflow-hidden">
            {jugador.foto_url ? <img src={jugador.foto_url} alt="P" className="w-full h-full object-cover" /> : jugador.nombres.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{jugador.nombres} {jugador.apellidos}</h1>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">{jugador.estado_miembro}</span>
              <span className="bg-slate-100 text-slate-600 border px-2 py-1 rounded-full text-[10px] font-bold uppercase">{jugador.rol}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEdicion(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Edit className="w-3.5 h-3.5" /> Editar</button>
          <button onClick={eliminarJugador} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Datos Personales</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Documento</span><span className="text-slate-800 font-bold">{jugador.documento_identidad || '---'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Teléfono</span><span className="text-slate-800 font-bold">{jugador.telefono || '---'}</span></div>
             <div className="flex justify-between"><span className="text-slate-500 text-sm">Categoría</span><span className="text-slate-800 font-bold">{jugador.grupos || 'Sin asignar'}</span></div>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-500" /> Estado Financiero</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Plan</span><span className="text-slate-800 font-bold">{jugador.tipo_plan || 'Regular'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Estado Pago</span><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${esAlDia ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{esAlDia ? 'Al día' : 'Pendiente'}</span></div>
             <div className="flex justify-between"><span className="text-slate-500 text-sm">Puntos</span><span className="text-slate-800 font-bold">{jugador.puntos || 0} GP</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}