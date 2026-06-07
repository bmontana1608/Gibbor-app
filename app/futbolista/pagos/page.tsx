'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CreditCard, Download, Search, 
  Calendar, CheckCircle2, ArrowRight,
  Wallet, FileText, Landmark, Smartphone, Building2
} from "lucide-react";
import { toast } from "sonner";

export default function PagosFutbolista() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [configPago, setConfigPago] = useState<any>(null);
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

        if (userData?.club_id) {
          // Obtenemos los canales de pago
          const { data: configData } = await supabase
            .from("configuracion_wa")
            .select("nequi, daviplata, bre_b, banco_nombre, banco_numero")
            .eq("club_id", userData.club_id)
            .single();
          if (configData) setConfigPago(configData);
        }

        // Obtenemos el historial de pagos
        const { data: pagosData } = await supabase
          .from("pagos_ingresos")
          .select("*")
          .eq("jugador_id", session.user.id)
          .order("fecha", { ascending: false });
        
        if (pagosData) setPagos(pagosData);
      }
      setCargando(false);
    };
    fetchPagos();
  }, []);

  const normalizeDate = (d: string | null | undefined) => {
    if (!d || d === 'null' || d === 'undefined') return '';
    if (d.includes('-')) return d.split('T')[0];
    const parts = d.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return d;
  };

  if (cargando) return <div className="animate-pulse space-y-6">
    <div className="h-32 bg-slate-200 rounded-3xl w-full"></div>
    <div className="h-64 bg-slate-200 rounded-3xl w-full"></div>
  </div>;

  const handleOpenApp = (numero: string, uriScheme: string, appName: string) => {
     // 1. Copiar número al portapapeles
     navigator.clipboard.writeText(numero).then(() => {
        toast.success(`Número de ${appName} copiado al portapapeles`);
     }).catch(() => {
        toast.info(`Número: ${numero}`);
     });

     // 2. Intentar abrir la aplicación nativa después de un breve tiempo
     setTimeout(() => {
        window.location.href = uriScheme;
     }, 800);
  };

  const now = new Date();
  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();
  
  // Calcular estado real basándose en los pagos del mes actual
  const currentMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const haPagadoEsteMes = pagos.some(p => p.fecha && String(p.fecha).startsWith(currentMonthStr) && !String(p.concepto || '').toLowerCase().includes('aporte'));
  
  // Si tiene beca del 100%, siempre está al día
  const esBeca = (perfil?.tipo_plan || '').toLowerCase().includes('beca 100');
  const estadoPagoReal = (haPagadoEsteMes || esBeca) ? 'Al día' : 'Pendiente';
  
  // Si está al día y ya pasó el día 10, el próximo pago es el mes siguiente
  // Si está al día y NO ha pasado el día 10, el próximo pago es este mes.
  // Si está pendiente, siempre debe el mes actual o anterior, dejamos el mes actual.
  if (estadoPagoReal === 'Al día') {
     targetMonth += 1;
     if (targetMonth > 11) {
       targetMonth = 0;
       targetYear += 1;
     }
  }

  const nextDateObj = new Date(targetYear, targetMonth, 10);
  const monthName = nextDateObj.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* TÍTULO Y RESUMEN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <CreditCard className="text-brand w-8 h-8" /> FINANZAS
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Control de tus mensualidades y recibos</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${estadoPagoReal === 'Al día' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</p>
              <p className={`font-black uppercase ${estadoPagoReal === 'Al día' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {estadoPagoReal}
              </p>
           </div>
        </div>
      </div>

      {/* TARJETA DE PRÓXIMO PAGO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 space-y-4">
            <p className="text-brand text-xs font-black uppercase tracking-[0.2em]">Próximo Vencimiento</p>
            <div className="flex items-end gap-2">
               <h2 className="text-4xl md:text-5xl font-black">10 {monthName}</h2>
               <span className="text-slate-500 font-bold mb-1">{targetYear}</span>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                  <Wallet className="w-4 h-4 border-brand/40" />
                  <span className="text-xs font-bold">$120,000 COP</span>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 border-brand/40" />
                  <span className="text-xs font-bold text-slate-300">Mensualidad Regular</span>
               </div>
            </div>
         </div>
         {/* Background Decoration */}
         <div className="absolute right-0 bottom-0 p-8 opacity-10">
            <CreditCard className="w-48 h-48 -rotate-12" />
         </div>
      </div>

      {/* CANALES DE PAGO CONFIGURADOS */}
      {configPago && (configPago.nequi || configPago.daviplata || configPago.bre_b || configPago.banco_numero) && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Landmark className="text-brand" /> Canales de Pago
             </h3>
             <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">Toca para copiar y abrir</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configPago.nequi && (
                <button 
                  onClick={() => handleOpenApp(configPago.nequi, 'nequi://', 'Nequi')}
                  className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#39154E]/10 text-[#39154E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nequi</p>
                      <p className="font-bold text-slate-800">{configPago.nequi}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#39154E] transition-colors" />
                </button>
              )}
              {configPago.daviplata && (
                <button 
                  onClick={() => handleOpenApp(configPago.daviplata, 'daviplata://', 'Daviplata')}
                  className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daviplata</p>
                      <p className="font-bold text-slate-800">{configPago.daviplata}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-colors" />
                </button>
              )}
              {configPago.bre_b && (
                <button 
                  onClick={() => handleOpenApp(configPago.bre_b, 'bancolombiapersonas://', 'Bre-B')}
                  className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bre-B</p>
                      <p className="font-bold text-slate-800">{configPago.bre_b}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              )}
              {configPago.banco_numero && (
                <button 
                  onClick={() => handleOpenApp(configPago.banco_numero, 'bancolombiapersonas://', configPago.banco_nombre || 'Banco')}
                  className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 md:col-span-2 lg:col-span-3 transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {configPago.banco_nombre || 'Cuenta Bancaria'}
                      </p>
                      <p className="font-bold text-slate-800">{configPago.banco_numero}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </button>
              )}
           </div>
        </div>
      )}

      {/* LISTA DE PAGOS */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
              <FileText className="text-brand" /> Historial de Pagos
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
                      <div className="text-brand group-hover:text-brand transition-all shadow-sm">
                         <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                         {(() => {
                           const normalized = normalizeDate(pago.fecha);
                           const dateObj = normalized ? new Date(normalized + 'T00:00:00') : null;
                           const dateStr = dateObj && !isNaN(dateObj.getTime())
                             ? dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                             : 'Pago s/f';
                           return (
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                               {dateStr}
                             </p>
                           );
                         })()}
                         <h4 className="font-black text-slate-800 text-lg leading-none mt-1">
                            ${(pago.total || pago.monto_recibido || pago.monto || 0).toLocaleString('es-ES')} <span className="text-[10px] font-bold text-slate-400">COP</span>
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
