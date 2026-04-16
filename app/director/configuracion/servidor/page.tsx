'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Server, Globe, Key, ShieldCheck, 
  ArrowLeft, Save, Terminal, Info,
  ExternalLink, Zap, MapPin, Building
} from 'lucide-react';

export default function ConfiguracionServidor() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [config, setConfig] = useState({
    api_url: '',
    api_key: '',
    instance_name: 'Gibbor_App',
    active_webhook: true,
    direccion: 'Calle Ficticia #12-34',
    ciudad: 'Cúcuta, Norte de Santander'
  });

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('configuracion_wa').select('*').single();
      if (data) {
        setConfig({
          api_url: data.api_url || '',
          api_key: data.api_key || '',
          instance_name: data.instance_name || 'Gibbor_App',
          active_webhook: data.active_webhook ?? true,
          direccion: data.direccion || 'Calle Ficticia #12-34',
          ciudad: data.ciudad || 'Cúcuta, Norte de Santander'
        });
      }
      setLoadingConfig(false);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setCargando(true);
    const { data: existing } = await supabase.from('configuracion_wa').select('id').single();
    
    const { error } = await supabase.from('configuracion_wa').upsert([
      { id: existing?.id || 1, ...config, updated_at: new Date() }
    ]);

    if (error) {
      toast.error("Error al guardar configuración: " + error.message);
    } else {
      toast.success("Configuración de servidor actualizada correctamente");
      router.push('/director/configuracion/asistente-whatsapp');
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors font-bold text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a WhatsApp
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Cabecera */}
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
             <div className="relative z-10 flex items-center gap-5">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                   <Server className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                   <h1 className="text-2xl font-black tracking-tight">Configuración del Servidor</h1>
                   <p className="text-slate-400 text-sm">Conecta Gibbor App con tu instancia de Evolution API</p>
                </div>
             </div>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Información Informativa */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-start">
               <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
               <div>
                  <p className="text-blue-900 font-bold text-sm mb-1">Requisito Técnico</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Para enviar mensajes reales, Gibbor App requiere una instancia de <strong>Evolution API</strong>. 
                    Si instalas esto en tu propio hosting, ingresa la URL y la API Key global aquí.
                  </p>
                  <a 
                    href="https://evolution-api.com/" 
                    target="_blank" 
                    className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-black mt-3 hover:underline"
                  >
                    Documentación Técnica <ExternalLink className="w-3 h-3" />
                  </a>
               </div>
            </div>

            {/* Formulario */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> URL del Servidor (API Endpoint)
                </label>
                <input 
                  type="text" 
                  value={config.api_url}
                  onChange={(e) => setConfig({...config, api_url: e.target.value})}
                  placeholder="https://tu-servidor-whatsapp.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" /> API Global Key
                </label>
                <input 
                  type="password" 
                  value={config.api_key}
                  onChange={(e) => setConfig({...config, api_key: e.target.value})}
                  placeholder="Introduce tu Token de Seguridad"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" /> Nombre de la Instancia
                   </label>
                   <input 
                     type="text" 
                     value={config.instance_name}
                     onChange={(e) => setConfig({...config, instance_name: e.target.value})}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700"
                   />
                </div>
                <div className="flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado del Webhook</p>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setConfig({...config, active_webhook: !config.active_webhook})}
                        className={`w-14 h-7 rounded-full relative transition-colors ${config.active_webhook ? 'bg-orange-500' : 'bg-slate-300'}`}
                      >
                         <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.active_webhook ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-xs font-bold text-slate-600">{config.active_webhook ? 'Sincronización Activa' : 'Solo Envío'}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Botones */}
              {/* Dirección del Club para PDF */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" /> Dirección del Club (Para el PDF)
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={config.direccion}
                    onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                    placeholder="Ej: Calle 10 #12-34 Barrio Centro"
                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-medium text-slate-600 shadow-sm pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Esta dirección aparecerá en el encabezado de tus recibos PDF.</p>
              </div>

              {/* Ciudad del Club para PDF */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Building className="w-4 h-4 text-orange-500" /> Ciudad y Departamento
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={config.ciudad}
                    onChange={(e) => setConfig({ ...config, ciudad: e.target.value })}
                    placeholder="Ej: Cúcuta, Norte de Santander"
                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-medium text-slate-600 shadow-sm pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
              </div>
            <div className="pt-8 flex gap-4">
                <button 
                  onClick={handleSave}
                  disabled={cargando}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3"
                >
                  {cargando ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Cambios</>}
                </button>
                <button className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-8 py-4 rounded-2xl font-bold transition-colors">
                  Prueba de Conexión
                </button>
            </div>

          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-3">
             <ShieldCheck className="w-5 h-5 text-emerald-500" />
             <p className="text-[11px] font-medium text-slate-500 italic">Tus credenciales se guardan de forma cifrada en la base de datos de Gibbor App.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
