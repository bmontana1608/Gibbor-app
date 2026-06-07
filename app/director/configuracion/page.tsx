'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Settings, Save, MapPin, CreditCard, Bot, 
  Smartphone, Building, Globe, Key, ShieldCheck, Zap, Wallet, X, Search, PlusCircle, Palette, Upload, Loader2, Image as ImageIcon
} from 'lucide-react';
import { useTenant } from '@/lib/hooks/useTenant';

export default function ConfiguracionGeneral() {
  const [cargando, setCargando] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isModalVincularOpen, setIsModalVincularOpen] = useState(false);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [hijosIds, setHijosIds] = useState<string[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const { slug: tenantSlug } = useTenant();

  const [config, setConfig] = useState({
    api_url: '', api_key: '', instance_name: 'Club_App',
    direccion: '', ciudad: '', nequi: '', daviplata: '',
    bre_b: '', banco_nombre: '', banco_numero: '',
    hijos_config: '',
    nombre_club: 'TU CLUB',
    temporada_actual: 'TEMPORADA 2024'
  });

  const [identidad, setIdentidad] = useState({
    logo_url: '',
    color_primario: '#06b6d4',
    color_secundario: '#0284c7'
  });
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  // Estados de WhatsApp
  const [waStatus, setWaStatus] = useState<'loading'|'disconnected'|'qr'|'connected'>('loading');
  const [waQr, setWaQr] = useState<string>('');
  const [waInstanceData, setWaInstanceData] = useState<any>(null);
  const [waConnecting, setWaConnecting] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      if (!tenantSlug) {
        setLoadingConfig(false);
        return;
      }
      try {
        console.log("DEBUG MCM: Cargando config para:", tenantSlug);
        const tenantRes = await fetch(`/api/tenant?slug=${tenantSlug}`, { cache: 'no-store' });
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        if (!tenantData || !tenantData.id) {
          console.warn("DEBUG MCM: No se encontró ID para el tenant:", tenantSlug);
          setLoadingConfig(false);
          return;
        }

        const { data } = await supabase.from('configuracion_wa').select('*').eq('club_id', tenantData.id).maybeSingle();
        const añoActual = new Date().getFullYear();
        
        if (data) {
          setConfig(prev => ({
            ...prev,
            ...data,
            nombre_club: data.nombre_club || tenantData.config?.nombre || 'MI CLUB',
            temporada_actual: data.temporada_actual || `TEMPORADA ${añoActual}`,
            hijos_config: data.hijos_config || ''
          }));
          if (data.hijos_config) setHijosIds(data.hijos_config.split(','));
        } else {
          setConfig(prev => ({
            ...prev,
            nombre_club: tenantData.config?.nombre || 'MI CLUB',
            temporada_actual: `TEMPORADA ${añoActual}`
          }));
        }

        const { data: clubData } = await supabase.from('clubes').select('logo_url, color_primario, color_secundario').eq('id', tenantData.id).single();
        if (clubData) {
          setIdentidad({
            logo_url: clubData.logo_url || '',
            color_primario: clubData.color_primario || '#06b6d4',
            color_secundario: clubData.color_secundario || '#0284c7'
          });
        }
        setLoadingConfig(false);

        const { data: jugData } = await supabase.from('perfiles').select('id, nombres, apellidos').eq('rol', 'Futbolista').eq('club_id', tenantData.id);
        if (jugData) setJugadores(jugData);

        const { data: planesData } = await supabase.from('planes').select('*').eq('club_id', tenantData.id);
        if (planesData) setPlanes(planesData);

        // Fetch WhatsApp Status
        await fetchWaStatus(tenantData.slug);

      } catch (err) {
        console.error('Error cargando configuración:', err);
        setLoadingConfig(false);
        setWaStatus('disconnected');
      }
    }

    async function fetchWaStatus(slug: string) {
      try {
        const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
        const data = await res.json();
        if (data.status === 'connected') {
          setWaStatus('connected');
          setWaInstanceData(data.stateData);
        } else if (data.status === 'qr') {
          setWaStatus('qr');
          setWaQr(data.qr);
        } else {
          setWaStatus('disconnected');
        }
      } catch (e) {
        setWaStatus('disconnected');
      }
    }

    loadConfig();
  }, [tenantSlug]);

  const fetchWaStatusRef = async () => {
    if (!tenant?.slug) return;
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${tenant.slug}`);
      const data = await res.json();
      
      if (!res.ok) {
        if (waConnecting) {
          toast.error("Error WhatsApp: " + (data.details || data.error || 'Error desconocido'));
        }
        setWaStatus('disconnected');
        return;
      }

      if (data.status === 'connected') {
        setWaStatus('connected');
        setWaInstanceData(data.stateData);
      } else if (data.status === 'qr') {
        setWaStatus('qr');
        setWaQr(data.qr);
      } else {
        setWaStatus('disconnected');
      }
    } catch (e) {
      setWaStatus('disconnected');
    }
  };

  // Polling para cuando estemos esperando el QR
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waStatus === 'qr' && tenant?.slug) {
      interval = setInterval(() => {
        fetchWaStatusRef();
      }, 10000); // Polling cada 10 seg
    }
    return () => clearInterval(interval);
  }, [waStatus, tenant]);

  const connectWa = async () => {
    if (!tenant?.slug) return;
    setWaConnecting(true);
    setWaStatus('loading');
    await fetchWaStatusRef();
    setWaConnecting(false);
  };

  const disconnectWa = async () => {
    if (!tenant?.slug) return;
    if (!window.confirm('¿Seguro que deseas desconectar el WhatsApp del club?')) return;
    setWaConnecting(true);
    try {
      await fetch(`/api/whatsapp/instance?slug=${tenant.slug}`, { method: 'DELETE' });
      setWaStatus('disconnected');
      setWaQr('');
      toast.success('WhatsApp desconectado correctamente');
    } catch (e) {
      toast.error('Error al desconectar');
    }
    setWaConnecting(false);
  };

  const handleSave = async () => {
    if (!tenant?.id) {
      toast.error("Error: Club no identificado.");
      return;
    }
    setCargando(true);
    const { data: existing } = await supabase.from('configuracion_wa').select('id').eq('club_id', tenant.id).maybeSingle();
    
    const payload: any = { 
      ...config, 
      hijos_config: hijosIds.join(','), 
      club_id: tenant.id,
      updated_at: new Date() 
    };
    
    if (existing?.id) {
      payload.id = existing.id;
    }

    const { error } = await supabase.from('configuracion_wa').upsert(payload);

    const resClub = await fetch('/api/tenant/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tenant.id,
        payload: {
          nombre: config.nombre_club,
          logo_url: identidad.logo_url,
          color_primario: identidad.color_primario,
          color_secundario: identidad.color_secundario
        }
      })
    });
    
    const clubResult = await resClub.json();
    const errorClub = clubResult.error ? { message: clubResult.error } : null;

    if (errorClub) {
      toast.error("Error al guardar identidad visual: " + errorClub.message);
    }

    if (error && !error.message.includes('hijos_config')) {
      toast.error("Error al guardar ajustes: " + error.message);
    } else if (error && error.message.includes('hijos_config')) {
      toast.error("Debes añadir la columna 'hijos_config' (Text) en la tabla 'configuracion_wa' de Supabase.");
    } else if (!errorClub) {
      toast.success("Ajustes e identidad visual actualizados ✨");
    }
    setCargando(false);
  };

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setSubiendoLogo(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${tenant?.id || 'club'}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath);
      setIdentidad(prev => ({ ...prev, logo_url: data.publicUrl }));
      toast.success('Logo subido correctamente. Pulsa "Guardar Todo" para aplicar.');
    } catch (error: any) {
      toast.error('Error al subir logo: ' + error.message);
    } finally {
      setSubiendoLogo(false);
    }
  };

  const actualizarDiasPlan = async (planId: string, nuevosDias: number[]) => {
    const toastId = toast.loading("Actualizando restricciones del plan...");
    try {
      const planActual = planes.find(p => p.id === planId);
      const nuevoTipo = `${planActual.tipo.split(':')[0]}:[${nuevosDias.join(',')}]`;
      
      const { error } = await supabase
        .from('planes')
        .update({ tipo: nuevoTipo })
        .eq('id', planId);

      if (error) throw error;
      
      setPlanes(planes.map(p => p.id === planId ? { ...p, tipo: nuevoTipo } : p));
      toast.success("Días de entrenamiento actualizados", { id: toastId });
    } catch (err: any) {
      toast.error("Error al actualizar días: " + err.message, { id: toastId });
    }
  };

  const getDiasFromTipo = (tipo: string) => {
    const match = tipo.match(/\[(.*?)\]/);
    if (match) return match[1].split(',').filter(Boolean).map(Number);
    
    // Default si no tiene (asumimos todos para no bloquear)
    return [0,1,2,3,4,5,6];
  };

  if (loadingConfig) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="text-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/15 rotate-2">
              <Settings className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ajustes del Club</h1>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Identidad, Pagos y Robot de WhatsApp</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={cargando} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-slate-100">
            {cargando ? 'Guardando...' : <><Save className="w-5 h-5 border-brand/40" /> Guardar Todo</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* IDENTIDAD */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Building className="text-brand" /> Identidad del Club</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Nombre del Club (en Carnet)</label>
                <input type="text" value={config.nombre_club} onChange={(e) => setConfig({...config, nombre_club: e.target.value})} className="text-brand font-black text-sm uppercase" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Temporada Actual</label>
                <input type="text" value={config.temporada_actual} onChange={(e) => setConfig({...config, temporada_actual: e.target.value})} className="text-brand font-black text-sm uppercase" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Dirección Sede</label>
                <input type="text" value={config.direccion} onChange={(e) => setConfig({...config, direccion: e.target.value})} className="text-brand font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Ciudad</label>
                <input type="text" value={config.ciudad} onChange={(e) => setConfig({...config, ciudad: e.target.value})} className="text-brand font-bold text-sm" />
              </div>
            </div>
          </div>

          {/* IDENTIDAD VISUAL DEL CLUB */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit mt-8 lg:mt-0 lg:col-span-1 lg:row-start-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Palette className="text-brand" /> Identidad Visual
            </h2>
            <div className="space-y-6">
              
              {/* Logo Upload */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Logo Institucional</label>
                <div className="text-brand hover:bg-[rgba(var(--brand-primary-rgb),0.02)]">
                  <div className="w-24 h-24 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {identidad.logo_url ? (
                      <img src={identidad.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="text-center w-full">
                    <label className="cursor-pointer bg-white border border-slate-200 hover:border-brand text-slate-700 hover:text-brand px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm w-full relative overflow-hidden">
                      {subiendoLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {subiendoLogo ? "Procesando..." : "Cambiar Logo"}
                      <input type="file" accept="image/*" onChange={handleSubirLogo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={subiendoLogo} />
                    </label>
                    <p className="text-[9px] text-slate-400 mt-2 font-medium">Recomendado: PNG fondo transparente (1:1)</p>
                  </div>
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Color Primario</label>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <input 
                      type="color" 
                      value={identidad.color_primario} 
                      onChange={(e) => setIdentidad({...identidad, color_primario: e.target.value})}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input 
                      type="text" 
                      value={identidad.color_primario} 
                      onChange={(e) => setIdentidad({...identidad, color_primario: e.target.value})}
                      className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Secundario</label>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <input 
                      type="color" 
                      value={identidad.color_secundario} 
                      onChange={(e) => setIdentidad({...identidad, color_secundario: e.target.value})}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input 
                      type="text" 
                      value={identidad.color_secundario} 
                      onChange={(e) => setIdentidad({...identidad, color_secundario: e.target.value})}
                      className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-brand/10 rounded-xl p-3 border borderbg-brand/20">
                <p className="text-[9px] font-bold text-brand leading-relaxed">
                  💡 Estos colores se aplicarán automáticamente a toda la plataforma de tu club tras guardar y recargar la página.
                </p>
              </div>

            </div>
          </div>

          <div className="lg:col-span-2 space-y-8 lg:row-span-2">
            {/* PAGOS */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CreditCard className="text-brand" /> Métodos de Pago</h2>
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

            {/* WHATSAPP SAAS MODULE */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-500" /> WhatsApp</h2>
              
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                {waStatus === 'loading' && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-500">Comprobando conexión...</p>
                  </div>
                )}

                {waStatus === 'disconnected' && (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Bot className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">WhatsApp Desconectado</p>
                      <p className="text-[10px] text-slate-500 max-w-[250px] mx-auto mt-1">Conecta tu número oficial para enviar notificaciones automáticas y cobros a los alumnos de tu club.</p>
                    </div>
                    <button onClick={connectWa} disabled={waConnecting} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
                      {waConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Conectar WhatsApp
                    </button>
                  </div>
                )}

                {waStatus === 'qr' && (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm font-black text-slate-800">Escanea este código QR</p>
                    <p className="text-[10px] text-slate-500 mb-2">Abre WhatsApp en tu celular, ve a Dispositivos Vinculados y escanea este código. (Se actualizará en 20s)</p>
                    
                    <div className="p-4 bg-white rounded-2xl border-2 border-emerald-100 shadow-sm">
                      {waQr ? (
                        <img src={waQr.includes('base64') ? waQr : `data:image/png;base64,${waQr}`} alt="WhatsApp QR" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-emerald-500"/></div>
                      )}
                    </div>
                    <button onClick={() => setWaStatus('disconnected')} className="text-xs font-bold text-slate-500 hover:text-slate-800 mt-2">Cancelar</button>
                  </div>
                )}

                {waStatus === 'connected' && (
                  <div className="flex flex-col items-center gap-4 text-center w-full">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center relative">
                      <Bot className="w-8 h-8" />
                      <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-700">Conectado y Operativo</p>
                      <p className="text-[10px] text-slate-500 mt-1">El robot está enviando mensajes correctamente en nombre de tu club.</p>
                      {waInstanceData?.profileName && <p className="text-xs font-bold text-slate-800 mt-2">{waInstanceData.profileName}</p>}
                    </div>
                    <button onClick={disconnectWa} disabled={waConnecting} className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-2 border border-red-200 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors mt-2">
                      {waConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Desconectar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* GESTIÓN DE PLANES MULTICLUB */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="text-brand" /> Planes y Restricciones</h2>
                <p className="text-[9px] font-bold text-brand bg-brand/10 px-3 py-1 rounded-full uppercase tracking-tighter">SaaS Intelligence Active</p>
              </div>
              
              <div className="space-y-4">
                {planes.map(plan => {
                  const diasActivos = getDiasFromTipo(plan.tipo);
                  const diasLetras = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                  
                  return (
                    <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{plan.nombre}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">Define qué días autoriza este plan:</p>
                      </div>
                      
                      <div className="flex gap-1.5">
                        {diasLetras.map((letra, index) => {
                          const isActive = diasActivos.includes(index);
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                const nuevos = isActive 
                                  ? diasActivos.filter(d => d !== index)
                                  : [...diasActivos, index];
                                actualizarDiasPlan(plan.id, nuevos);
                              }}
                              className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all border ${
                                isActive 
                                ? 'bg-brand text-white text-brand shadow-sm' 
                                : 'bg-white text-slate-400 border-slate-200 hover:border-brand/40'
                              }`}
                            >
                              {letra}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 font-medium italic mt-4 text-center">
                * El sistema de asistencia solo mostrará a los alumnos en los días marcados aquí.
              </p>
            </div>

            {/* CONFIGURACIÓN FAMILIAR (Director Dad Mode) */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-brand rounded-2xl flex items-center justify-center shadow-lg bg-brand/20 rotate-3">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Configuración Familiar</h2>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">Vínculos del Director</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
                    Crea un acceso directo a los perfiles de tus hijos. Cuando entres al <span className="text-brand font-bold">Modo Jugador</span>, verás sus carnets y estados de cuenta automáticamente.
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
                              <div key={id} className="bg-brand/10 border borderbg-brand/20 px-4 py-2 rounded-xl flex items-center gap-3 group transition-all">
                                 <div className="bg-brand text-white">
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:text-brand text-sm font-bold"
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
                          className="w-full p-4 flex items-center justify-between hover:bg-brand/10 rounded-2xl transition-all group"
                        >
                           <div className="flex items-center gap-3">
                              <div className="bg-brand text-white">
                                {jug.nombres.charAt(0)}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800">{jug.nombres} {jug.apellidos}</p>
                              </div>
                           </div>
                           <PlusCircle className="text-brand" />
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
