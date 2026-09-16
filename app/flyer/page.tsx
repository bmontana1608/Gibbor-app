'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, CheckCircle2, Star, Shield, Smartphone, ArrowRight } from 'lucide-react';

export default function PromocionalFlyer() {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (flyerRef.current === null) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(flyerRef.current, {
        quality: 1,
        pixelRatio: 2, // Alta resolución
      });
      const link = document.createElement('a');
      link.download = 'mcm-flyer-promocional.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar el flyer:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-10 flex flex-col items-center justify-center font-sans">
      
      <div className="mb-8 text-center">
        <h1 className="text-white font-bold text-2xl mb-2">Generador de Flyers (MCM)</h1>
        <p className="text-slate-400 text-sm">Usa este flyer para publicar en Instagram, Facebook o WhatsApp</p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-6 bg-green-500 hover:bg-green-400 text-slate-900 font-black px-6 py-3 rounded-full flex items-center gap-2 mx-auto transition-all disabled:opacity-50"
        >
          {downloading ? 'Generando PNG...' : <><Download className="w-5 h-5" /> Descargar Flyer en Alta Calidad</>}
        </button>
      </div>

      {/* CONTENEDOR DEL FLYER (Formato Cuadrado para Instagram 1080x1080 aprox escalado) */}
      <div 
        ref={flyerRef}
        className="relative bg-slate-950 w-[800px] h-[800px] overflow-hidden flex flex-col items-center p-12 text-center"
        style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, #064e3b, #020617 80%)' }}
      >
        {/* Efectos de fondo */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Etiqueta Superior */}
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-widest relative z-10 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
          <Star className="w-4 h-4 fill-green-400" /> Para Escuelas de Fútbol
        </div>

        {/* Título Principal */}
        <h2 className="text-5xl font-black text-white tracking-tight leading-[1.1] mb-6 relative z-10">
          Digitaliza tu academia y <br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #34d399)' }}>
            olvídate de los excels
          </span>
        </h2>

        <p className="text-slate-300 text-xl mb-12 max-w-2xl font-medium relative z-10">
          Master Club Manager (MCM) es la plataforma todo-en-uno que tu club necesita para cobrar mensualidades y organizar a tus jugadores.
        </p>

        {/* Beneficios Grid */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-2xl relative z-10 mb-12">
          {[
             { icon: <Shield className="w-6 h-6 text-green-400" />, text: 'Control de Pagos Automático' },
             { icon: <Smartphone className="w-6 h-6 text-green-400" />, text: 'App para Padres y Jugadores' },
             { icon: <CheckCircle2 className="w-6 h-6 text-green-400" />, text: 'Convocatorias Oficiales' },
             { icon: <ArrowRight className="w-6 h-6 text-green-400" />, text: 'Notificaciones WhatsApp' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-700 backdrop-blur-sm p-5 rounded-2xl flex items-center gap-4 text-left shadow-xl">
              <div className="bg-green-500/10 p-3 rounded-xl">
                {item.icon}
              </div>
              <span className="text-white font-bold text-lg leading-tight">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Footer del Flyer */}
        <div className="mt-auto w-full flex items-center justify-between border-t border-slate-800 pt-8 relative z-10">
          <div className="text-left">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-1">Empieza tu prueba gratis</p>
            <p className="text-white font-black text-2xl tracking-wide">masterclubmanager.com</p>
          </div>
          
          <div className="bg-green-500 text-slate-900 px-6 py-3 rounded-xl font-black text-lg flex items-center gap-2 shadow-[0_0_30px_rgba(74,222,128,0.4)]">
            Marca Blanca Disponible
          </div>
        </div>
      </div>
    </div>
  );
}
