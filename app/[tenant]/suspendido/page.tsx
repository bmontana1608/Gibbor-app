'use client';

import { ShieldAlert, CreditCard, MessageCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaginaSuspendida() {
  const router = useRouter();

  return (
    <div className="bg-brand text-white">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bg-brand/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl text-center">
          
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 animate-bounce">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white mb-4 uppercase">
            Acceso <span className="text-red-500">Pausado</span>
          </h1>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Tu acceso a las funciones operativas de la academia ha sido restringido por falta de pago en la suscripción mensual de <span className="text-white font-bold italic tracking-wider">la plataforma</span>.
          </p>

          <div className="space-y-4 mb-10">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Actual</p>
                <p className="text-sm font-bold text-white">Factura en Mora (Día 5+)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.open('https://gibbor-app.vercel.app/admin/pagos', '_blank')}
              className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-brand/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <CreditCard className="w-5 h-5" /> Subir Comprobante
            </button>
            
            <button 
              onClick={() => window.open('https://wa.me/573000000000', '_blank')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 border border-slate-700"
            >
              <MessageCircle className="w-5 h-5" /> Soporte Técnico
            </button>
          </div>

          <button 
            onClick={() => router.back()}
            className="mt-8 text-slate-500 hover:text-white transition-colors text-xs font-bold flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Reintentar Acceso
          </button>

        </div>

        <p className="text-center mt-8 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
          Master Club Manager • SaaS Guard Protection
        </p>
      </div>
    </div>
  );
}
