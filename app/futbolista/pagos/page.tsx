'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CreditCard, Download, Search, 
  Calendar, CheckCircle2, ArrowRight,
  Wallet, FileText
} from "lucide-react";
import { toast } from "sonner";

export default function PagosFutbolista() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchPagos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Obtenemos el perfil para saber qué tarifa le toca
        const { data: userData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setPerfil(userData);

        // Obtenemos el historial de pagos
        const { data: pagosData } = await supabase
          .from("pagos_ingresos")
          .select("*")
          .eq("perfil_id", session.user.id)
          .order("fecha", { ascending: false });
        
        if (pagosData) setPagos(pagosData);
      }
      setCargando(false);
    };
    fetchPagos();
  }, []);

  if (cargando) return <div className="animate-pulse space-y-6">
    <div className="h-32 bg-slate-200 rounded-3xl w-full"></div>
    <div className="h-64 bg-slate-200 rounded-3xl w-full"></div>
  </div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* TÍTULO Y RESUMEN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <CreditCard className="text-orange-500 w-8 h-8" /> FINANZAS
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Control de tus mensualidades y recibos</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${perfil?.estado_pago === 'Al día' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</p>
              <p className="font-black text-slate-800 uppercase">{perfil?.estado_pago || 'Pendiente'}</p>
           </div>
        </div>
      </div>

      {/* TARJETA DE PRÓXIMO PAGO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 space-y-4">
            <p className="text-orange-500 text-xs font-black uppercase tracking-[0.2em]">Próximo Vencimiento</p>
            <div className="flex items-end gap-2">
               <h2 className="text-4xl md:text-5xl font-black">10 ABRIL</h2>
               <span className="text-slate-500 font-bold mb-1">2024</span>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold">$120,000 COP</span>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-slate-300">Mensualidad Regular</span>
               </div>
            </div>
         </div>
         {/* Background Decoration */}
         <div className="absolute right-0 bottom-0 p-8 opacity-10">
            <CreditCard className="w-48 h-48 -rotate-12" />
         </div>
      </div>

      {/* LISTA DE PAGOS */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" /> Historial de Pagos
            </h3>
            <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">{pagos.length} RECIBOS</span>
         </div>
         
         <div className="divide-y divide-slate-100">
            {pagos.length === 0 ? (
              <div className="p-20 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Search className="text-slate-300 w-8 h-8" />
                 </div>
                 <p className="text-slate-400 font-bold text-sm">Aún no hay pagos registrados en tu historial.</p>
              </div>
            ) : (
              pagos.map((pago: any) => (
                <div key={pago.id} className="p-6 md:px-8 hover:bg-slate-50 transition-colors group flex items-center justify-between">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:border-orange-500 group-hover:text-orange-500 transition-all shadow-sm">
                         <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'Pago s/f'}</p>
                         <h4 className="font-black text-slate-800 text-lg leading-none mt-1">
                            ${(pago.monto_recibido || pago.monto || 0).toLocaleString('es-ES')} <span className="text-[10px] font-bold text-slate-400">COP</span>
                         </h4>
                         <p className="text-xs text-slate-500 mt-1 font-medium italic">Vía {pago.metodo_pago || 'Efectivo'}</p>
                      </div>
                   </div>
                   
                   <button 
                     onClick={() => toast.success("Iniciando descarga de recibo...")}
                     className="p-3 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm group-hover:scale-110 active:scale-95"
                     title="Descargar Recibo"
                   >
                      <Download className="w-5 h-5" />
                   </button>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}
