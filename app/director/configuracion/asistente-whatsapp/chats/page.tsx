'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, MessageSquare, Search, 
  Filter, Calendar, ChevronRight, 
  Bot, User, Clock, CheckCheck,
  Smartphone, FilterIcon, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function HistorialChats() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensajes, setMensajes] = useState<any[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const { data, error } = await supabase
        .from('mensajes_wa')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        toast.error("Error al cargar historial: " + error.message);
      } else {
        setMensajes(data || []);
      }
      setCargando(false);
    }
    loadLogs();
  }, []);

  const mensajesFiltrados = mensajes.filter(m => 
    m.destinatario_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.destinatario_numero?.includes(busqueda)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <button 
          onClick={() => router.back()} 
          className="mb-6 text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors font-bold text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Asistente
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 border-2 border-white">
                 <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight">Historial de Conversaciones</h1>
                 <p className="text-slate-500 font-medium">Supervisa todos los mensajes enviados por tu robot.</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-100">
                 <Bot className="w-4 h-4" /> Robot Activo
              </div>
              <button className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-orange-600 transition-all shadow-sm">
                 <RefreshCw className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        
        {/* Barra de Filtros */}
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-slate-50/50">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre de papá o alumno..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-600 transition-all shadow-sm"
              />
           </div>
           
           <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                 <FilterIcon className="w-4 h-4" /> Filtros
              </button>
              <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                 <Calendar className="w-4 h-4" /> Fecha
              </button>
           </div>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
               <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
               <p className="font-bold text-slate-400">Cargando bitácora de mensajes...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
               {mensajesFiltrados.map((msg) => (
                 <div key={msg.id} className="p-6 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500 text-sm border-2 border-white shadow-sm transition-transform group-hover:scale-110 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                          {getInitials(msg.destinatario_nombre || '??')}
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-0.5">
                             <h4 className="font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{msg.destinatario_nombre}</h4>
                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                               msg.tipo_mensaje === 'Recibo de Pago' ? 'bg-blue-100 text-blue-700' :
                               msg.tipo_mensaje === 'Bienvenida' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                             }`}>
                               {msg.tipo_mensaje}
                             </span>
                          </div>
                          <p className="text-sm text-slate-500 font-medium truncate max-w-[300px]">
                            {msg.mensaje_texto}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-right">
                       <div className="hidden md:block">
                          <p className="text-xs font-bold text-slate-400 flex items-center justify-end gap-1.5 mb-1 uppercase tracking-widest text-[9px]">
                             <Clock className="w-3 h-3" /> {new Date(msg.created_at).toLocaleString()}
                          </p>
                          <div className="flex items-center justify-end gap-1.5">
                             <CheckCheck className={`w-4 h-4 ${msg.estado === 'leido' ? 'text-blue-500' : 'text-slate-300'}`} />
                             <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{msg.estado}</span>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-all" />
                    </div>
                 </div>
               ))}
               {mensajesFiltrados.length === 0 && (
                 <div className="p-20 text-center opacity-30">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-bold">No hay mensajes registrados aún.</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">Total de mensajes enviados este mes: <span className="text-emerald-600">1,245</span></p>
            <div className="flex items-center gap-2">
               <Smartphone className="w-4 h-4 text-slate-300" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectado desde iPhone de Alex</p>
            </div>
        </div>

      </div>

    </div>
  );
}
