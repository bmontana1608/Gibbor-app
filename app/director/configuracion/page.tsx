'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Settings, Save, MapPin, CreditCard, Bot, 
  Smartphone, Building, Globe, Key, ShieldCheck, Zap, Wallet, X, Search, PlusCircle
} from 'lucide-react';

export default function ConfiguracionGeneral() {
  const [cargando, setCargando] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isModalVincularOpen, setIsModalVincularOpen] = useState(false);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [hijosIds, setHijosIds] = useState<string[]>([]);

  const [config, setConfig] = useState({
    api_url: '', api_key: '', instance_name: 'Gibbor_App',
    direccion: '', ciudad: '', nequi: '', daviplata: '',
    bre_b: '', banco_nombre: '', banco_numero: '',
    hijos_config: '' // Usaremos este campo para guardar los IDs
  });

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('configuracion_wa').select('*').single();
      if (data) {
        setConfig({
          ...config,
          ...data,
          hijos_config: data.hijos_config || ''
        });
        if (data.hijos_config) setHijosIds(data.hijos_config.split(','));
      }
      setLoadingConfig(false);

      const { data: jugData } = await supabase.from('perfiles').select('id, nombres, apellidos').eq('rol', 'Futbolista');
      if (jugData) setJugadores(jugData);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setCargando(true);
    const { data: existing } = await supabase.from('configuracion_wa').select('id').single();
    const payload = { ...config, hijos_config: hijosIds.join(','), id: existing?.id || 1, updated_at: new Date() };
    const { error } = await supabase.from('configuracion_wa').upsert([payload]);
    if (error) {
      if (error.message.includes('column "hijos_config" does not exist')) {
        toast.error("Debes añadir la columna 'hijos_config' (Text) en la tabla 'configuracion_wa' de Supabase.");
      } else {
        toast.error("Error al guardar: " + error.message);
      }
    } else {
      toast.success("Ajustes y vínculos familiares actualizados ✨");
    }
    setCargando(false);
  };

  if (loadingConfig) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100 rotate-2">
              <Settings className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ajustes del Club</h1>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Identidad, Pagos y Robot de WhatsApp</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={cargando} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-slate-100">
            {cargando ? 'Guardando...' : <><Save className="w-5 h-5 text-orange-400" /> Guardar Todo</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* IDENTIDAD */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Building className="w-4 h-4 text-orange-500" /> Identidad</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Dirección</label>
                <input type="text" value={config.direccion} onChange={(e) => setConfig({...config, direccion: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Ciudad</label>
                <input type="text" value={config.ciudad} onChange={(e) => setConfig({...config, ciudad: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* PAGOS */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-500" /> Métodos de Pago</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-2"><Smartphone className="w-3 h-3 text-purple-500" /> Nequi</label>
                  <input type="text" value={config.nequi} onChange={(e) => setConfig({...config, nequi: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-2"><Smartphone className="w-3 h-3 text-red-500" /> Daviplata</label>
                  <input type="text" value={config.daviplata} onChange={(e) => setConfig({...config, daviplata: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500" /> Bre-B</label>
                  <input type="text" value={config.bre_b} onChange={(e) => setConfig({...config, bre_b: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2"><Wallet className="w-3 h-3 text-blue-500" /> Banco</label>
                  <input type="text" placeholder="Nombre Banco" value={config.banco_nombre} onChange={(e) => setConfig({...config, banco_nombre: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold mb-2" />
                  <input type="text" placeholder="Nº Cuenta" value={config.banco_numero} onChange={(e) => setConfig({...config, banco_numero: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                </div>
              </div>
            </div>

            {/* WHATSAPP */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-500" /> WhatsApp</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-2"><Globe className="w-3 h-3 text-blue-400" /> API URL</label>
                  <input type="text" value={config.api_url} onChange={(e) => setConfig({...config, api_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-2"><Key className="w-3 h-3 text-orange-400" /> API Key</label>
                  <input type="password" value={config.api_key} onChange={(e) => setConfig({...config, api_key: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* CONFIGURACIÓN FAMILIAR (Director Dad Mode) */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Configuración Familiar</h2>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">Vínculos del Director</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
                    Crea un acceso directo a los perfiles de tus hijos. Cuando entres al <span className="text-orange-500 font-bold">Modo Jugador</span>, verás sus carnets y estados de cuenta automáticamente.
                  </p>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Hijos Vinculados</label>
                     <div className="flex flex-wrap gap-3">
                        {hijosIds.length === 0 ? (
                          <div className="text-slate-500 text-xs italic">No has vinculado hijos todavía.</div>
                        ) : (
                          hijosIds.map(id => {
                            const jug = jugadores.find(j => j.id === id);
                            return (
                              <div key={id} className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-3 group transition-all">
                                 <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
                                   {jug?.nombres?.charAt(0)}
                                 </div>
                                 <span className="text-xs font-bold text-slate-200">{jug?.nombres} {jug?.apellidos}</span>
                                 <button 
                                   onClick={() => setHijosIds(hijosIds.filter(h => h !== id))}
                                   className="text-slate-500 hover:text-red-400 p-1"
                                 >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                            );
                          })
                        )}
                     </div>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      onClick={() => setIsModalVincularOpen(true)}
                      className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white text-white hover:text-slate-900 px-6 py-3 rounded-xl transition-all border border-white/10"
                    >
                      + Vincular nuevo hijo
                    </button>
                  </div>
                </div>
              </div>
              <Zap className="absolute right-[-30px] bottom-[-30px] w-48 h-48 text-white/5 -rotate-12" />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VINCULAR HIJO */}
      {isModalVincularOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Vincular Hijo</h3>
                 <button onClick={() => setIsModalVincularOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                 </div>
                 
                 <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {jugadores
                      .filter(j => 
                        (j.nombres + " " + j.apellidos).toLowerCase().includes(busqueda.toLowerCase()) && 
                        !hijosIds.includes(j.id)
                      )
                      .map(jug => (
                        <button 
                          key={jug.id}
                          onClick={() => {
                            setHijosIds([...hijosIds, jug.id]);
                            setIsModalVincularOpen(false);
                          }}
                          className="w-full p-4 flex items-center justify-between hover:bg-orange-50 rounded-2xl transition-all group"
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs group-hover:bg-orange-500 group-hover:text-white">
                                {jug.nombres.charAt(0)}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800">{jug.nombres} {jug.apellidos}</p>
                              </div>
                           </div>
                           <PlusCircle className="w-4 h-4 text-slate-300 group-hover:text-orange-500" />
                        </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
