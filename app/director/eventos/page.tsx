'use client';

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Clock, MapPin, Users, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function GestionEventos() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    tipo: 'Entrenamiento',
    fecha: '',
    hora: '',
    lugar: '',
    categoria_id: ''
  });

  const fetchEventos = async () => {
    const res = await fetch('/api/eventos');
    const data = await res.json();
    setEventos(data || []);
    setCargando(false);
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEvento.titulo || !nuevoEvento.fecha || !nuevoEvento.hora) {
      return toast.error("Por favor completa los campos básicos");
    }

    const toastId = toast.loading("Guardando evento...");
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEvento)
      });

      if (res.ok) {
        toast.success("¡Evento publicado con éxito!", { id: toastId });
        setNuevoEvento({ titulo: '', tipo: 'Entrenamiento', fecha: '', hora: '', lugar: '', categoria_id: '' });
        fetchEventos();
      } else {
        toast.error("Error al guardar el evento", { id: toastId });
      }
    } catch (err) {
      toast.error("Fallo de conexión", { id: toastId });
    }
  };

  const eliminarEvento = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este evento?")) return;
    
    const res = await fetch(`/api/eventos?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Evento eliminado");
      fetchEventos();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Gestión de <span className="text-orange-500">Agenda</span></h1>
          <p className="text-slate-500 font-medium">Programa partidos, entrenamientos y eventos para el club.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FORMULARIO */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500" /> Nuevo Evento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Título</label>
              <input 
                type="text" 
                placeholder="Ej: Final de Torneo"
                className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                value={nuevoEvento.titulo}
                onChange={e => setNuevoEvento({...nuevoEvento, titulo: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Tipo</label>
                <select 
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  value={nuevoEvento.tipo}
                  onChange={e => setNuevoEvento({...nuevoEvento, tipo: e.target.value})}
                >
                  <option value="Entrenamiento">Entrenamiento</option>
                  <option value="Partido">Partido</option>
                  <option value="Evento">Evento Social</option>
                  <option value="Pago">Recordatorio Pago</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Fecha</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  value={nuevoEvento.fecha}
                  onChange={e => setNuevoEvento({...nuevoEvento, fecha: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Hora</label>
                <input 
                  type="time" 
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  value={nuevoEvento.hora}
                  onChange={e => setNuevoEvento({...nuevoEvento, hora: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Lugar</label>
                <input 
                  type="text" 
                  placeholder="Sede Norte"
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                  value={nuevoEvento.lugar}
                  onChange={e => setNuevoEvento({...nuevoEvento, lugar: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Categoría (Opcional)</label>
              <input 
                type="text" 
                placeholder="Vacio para todos"
                className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold outline-none"
                value={nuevoEvento.categoria_id}
                onChange={e => setNuevoEvento({...nuevoEvento, categoria_id: e.target.value})}
              />
              <p className="text-[9px] text-slate-400 mt-2 px-2 italic">Si quieres que sea para una categoría, escribe el nombre tal cual aparece en el perfil.</p>
            </div>

            <button type="submit" className="w-full bg-orange-500 text-white font-black uppercase text-xs tracking-widest p-5 rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Publicar Evento
            </button>
          </form>
        </div>

        {/* LISTADO PRÓXIMOS */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">Próximos en Agenda</h2>
          {cargando ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-slate-100 rounded-[2rem]"></div>
              <div className="h-32 bg-slate-100 rounded-[2rem]"></div>
            </div>
          ) : eventos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {eventos.map((evento) => (
                <div key={evento.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
                      evento.tipo === 'Partido' ? 'bg-orange-500' : 
                      evento.tipo === 'Entrenamiento' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      {evento.tipo === 'Partido' ? <Trophy className="w-7 h-7" /> : <Calendar className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg uppercase leading-none">{evento.titulo}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Clock className="w-3 h-3 text-orange-500" /> {evento.fecha} | {evento.hora.substring(0, 5)}</span>
                        {evento.lugar && <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin className="w-3 h-3 text-orange-500" /> {evento.lugar}</span>}
                        {evento.categoria_id && <span className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 p-1 rounded-lg"><Users className="w-3 h-3" /> {evento.categoria_id.split(' ')[0]}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => eliminarEvento(evento.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay eventos próximos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
