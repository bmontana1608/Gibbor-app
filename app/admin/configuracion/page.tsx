'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Settings, Bot, LifeBuoy, Smartphone, Zap, RefreshCw, CheckCircle2, Plus, Trash2, Sparkles, Key, Eye, EyeOff, Play } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

// Extracted SettingToggle component
const SettingToggle = ({ label, sub, enabled }: { label: string, sub: string, enabled: boolean }) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
    <div>
      <p className="font-bold text-slate-800">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-lime-500' : 'bg-gray-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

export default function ConfiguracionPage() {
  const [configAdmin, setConfigAdmin] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Gemini API Pool States (Hasta 10 claves con rotación)
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['']);
  const [mostrarKeys, setMostrarKeys] = useState<boolean[]>([]);
  const [guardandoPool, setGuardandoPool] = useState(false);
  const [probandoPool, setProbandoPool] = useState(false);

  // WhatsApp CRM States
  const [conectadoVentas, setConectadoVentas] = useState(false);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [qrCodeVentas, setQrCodeVentas] = useState<string | null>(null);

  useEffect(() => {
    cargarConfiguracion();
    verificarEstadoVentas();
  }, []);

  const verificarEstadoVentas = async () => {
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=mcm-ventas`);
      const data = await res.json();
      if (data.status === 'connected') {
        setConectadoVentas(true);
      } else if (data.status === 'qr') {
        setQrCodeVentas(data.qr);
      }
    } catch (e) {
      console.error("Error al verificar estado CRM:", e);
    }
  };

  const generarQRVentas = async () => {
    setCargandoVentas(true);
    setQrCodeVentas(null);
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=mcm-ventas`);
      const data = await res.json();
      if (data.status === 'qr') {
        setQrCodeVentas(data.qr);
        toast.success("¡Código QR Generado!");
      } else if (data.status === 'connected') {
        setConectadoVentas(true);
        toast.success("¡Ya estás conectado!");
      } else {
        toast.error("No se pudo generar QR. Revisa logs.");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setCargandoVentas(false);
    }
  };

  const cargarConfiguracion = async () => {
    setLoading(true);
    const { data } = await supabase.from('configuracion_superadmin').select('*').eq('id', 1).maybeSingle();
    setConfigAdmin(data || {});

    // Cargar pool de claves de Gemini
    const keys: string[] = [];
    if (Array.isArray(data?.gemini_api_keys)) {
      keys.push(...data.gemini_api_keys);
    } else if (typeof data?.gemini_api_keys === 'string') {
      try {
        const p = JSON.parse(data.gemini_api_keys);
        if (Array.isArray(p)) keys.push(...p);
      } catch {
        keys.push(...data.gemini_api_keys.split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean));
      }
    }
    if (keys.length === 0 && data?.gemini_api_key) {
      keys.push(data.gemini_api_key);
    }
    if (keys.length === 0) {
      keys.push('');
    }
    setGeminiKeys(keys);
    setLoading(false);
  };

  const agregarKey = () => {
    if (geminiKeys.length >= 10) {
      toast.error('El límite máximo es de 10 claves en el pool.');
      return;
    }
    setGeminiKeys([...geminiKeys, '']);
  };

  const actualizarKey = (index: number, val: string) => {
    const nuevos = [...geminiKeys];
    nuevos[index] = val.trim();
    setGeminiKeys(nuevos);
  };

  const eliminarKey = (index: number) => {
    if (geminiKeys.length <= 1) {
      setGeminiKeys(['']);
      return;
    }
    setGeminiKeys(geminiKeys.filter((_, i) => i !== index));
  };

  const toggleMostrarKey = (index: number) => {
    const nuevos = [...mostrarKeys];
    nuevos[index] = !nuevos[index];
    setMostrarKeys(nuevos);
  };

  const guardarPoolKeys = async () => {
    setGuardandoPool(true);
    try {
      const limpias = geminiKeys.map(k => k.trim()).filter(Boolean);
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_keys: limpias,
          gemini_api_key: limpias[0] || ''
        })
      });
      if (!res.ok) throw new Error('Error al guardar claves en la base de datos.');
      toast.success(`¡Pool de IA guardado con éxito! (${limpias.length} claves activas)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoPool(false);
    }
  };

  const probarPool = async () => {
    setProbandoPool(true);
    try {
      const res = await fetch('/api/admin/ai-test');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA');
      toast.success(data.message);
    } catch (err: any) {
      toast.error('Fallo en la prueba: ' + err.message);
    } finally {
      setProbandoPool(false);
    }
  };

  const guardarConfiguracion = async (campo: string, valor: string, mensajeExito: string) => {
    try {
      const payload: any = {};
      payload[campo] = valor;
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar en la base de datos.');
      toast.success(mensajeExito);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>;
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl">
      <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2"><Settings className="text-slate-500" /> Configuración</h2>
      <p className="text-sm text-gray-500 mb-6">Ajustes generales del núcleo de la plataforma.</p>
      
      <div className="space-y-3 mb-8">
        <SettingToggle label="Modo de Mantenimiento" sub="Suspender acceso a todos los clubes" enabled={false} />
        <SettingToggle label="Registro de Nuevos Clubes" sub="Permitir onboarding desde la Landing Page" enabled={true} />
      </div>
      
      <h3 className="font-bold text-slate-800 mb-4 border-t pt-6">Facturación SaaS y Soporte</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">WhatsApp de Soporte (Pagos)</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={configAdmin.telefono_soporte || ''} 
            onChange={e => setConfigAdmin({...configAdmin, telefono_soporte: e.target.value})}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
          />
          <button 
            onClick={() => guardarConfiguracion('telefono_soporte', configAdmin.telefono_soporte, 'Teléfono actualizado')}
            className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
          >
            Guardar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">A este número se redirigirán los clubes suspendidos por mora.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between border-t pt-6 mb-4 gap-2">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bot size={20} className="text-lime-600" /> Pool Global de Inteligencia Artificial (Gemini)
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-lg">
            Configura hasta 10 claves API de Gemini. Si una clave agota su cuota de peticiones diarias o por minuto, el sistema rotará automáticamente a la siguiente para que la IA nunca se detenga.
          </p>
        </div>
        <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 bg-lime-100 text-lime-800 rounded-full border border-lime-200">
          {geminiKeys.filter(k => k.trim()).length}/10 Claves en el Pool
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 space-y-4">
        <div className="space-y-3">
          {geminiKeys.map((keyVal, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} className="text-slate-400" />
                  {idx === 0 ? 'Clave Principal #1' : `Clave de Respaldo #${idx + 1}`}
                  {idx === 0 && <span className="text-[10px] text-lime-600 font-black">(Prioridad Alta)</span>}
                </label>
                {geminiKeys.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarKey(idx)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type={mostrarKeys[idx] ? "text" : "password"}
                  placeholder="AIzaSy..." 
                  value={keyVal} 
                  onChange={e => actualizarKey(idx, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleMostrarKey(idx)}
                  className="px-3 border border-gray-200 hover:bg-gray-50 text-gray-400 rounded-xl transition-colors"
                  title={mostrarKeys[idx] ? "Ocultar" : "Mostrar"}
                >
                  {mostrarKeys[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={agregarKey}
            disabled={geminiKeys.length >= 10}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-700 hover:text-lime-800 bg-lime-50 hover:bg-lime-100 px-3.5 py-2 rounded-xl border border-lime-200 disabled:opacity-40 transition-all"
          >
            <Plus size={15} /> Añadir otra Clave de Respaldo ({geminiKeys.length}/10)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={probarPool}
              disabled={probandoPool || geminiKeys.filter(k => k.trim()).length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl border border-gray-200 disabled:opacity-40 transition-all"
            >
              {probandoPool ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Probar Conexión del Pool
            </button>

            <button 
              type="button"
              onClick={guardarPoolKeys}
              disabled={guardandoPool}
              className="inline-flex items-center gap-1.5 bg-lime-500 hover:bg-lime-400 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {guardandoPool ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Guardar Pool
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-1">
          💡 Puedes obtener múltiples claves gratuitas usando diferentes cuentas de Google en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-lime-600 underline font-bold">Google AI Studio</a>.
        </p>
      </div>

      <h3 className="font-bold text-slate-800 mb-4 border-t pt-6 flex items-center gap-2"><LifeBuoy size={18} /> Integraciones de Soporte</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Slack Webhook URL (Tickets)</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="https://hooks.slack.com/services/..." 
            value={configAdmin.slack_webhook_url || ''} 
            onChange={e => setConfigAdmin({...configAdmin, slack_webhook_url: e.target.value})}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
          />
          <button 
            onClick={() => guardarConfiguracion('slack_webhook_url', configAdmin.slack_webhook_url, 'Webhook de Slack guardado.')}
            className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
          >
            Guardar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Los nuevos tickets se enviarán automáticamente a este canal de Slack.</p>
      </div>

      <h3 className="font-bold text-slate-800 mb-4 border-t pt-6 flex items-center gap-2"><Smartphone size={18} /> Vinculación de WhatsApp CRM</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-12">
        <p className="text-sm text-gray-600 mb-4">
          Conecta el número principal de ventas de Master Club Manager. Este número será utilizado por todos los embajadores en el CRM.
        </p>

        {conectadoVentas ? (
          <div className="bg-lime-50 rounded-xl p-6 text-center border border-lime-200">
            <CheckCircle2 className="w-12 h-12 text-lime-500 mx-auto mb-2" />
            <h3 className="font-bold text-lime-900 text-lg">Dispositivo Vinculado</h3>
            <p className="text-lime-700 text-sm mt-1">
              La línea de WhatsApp de Ventas (mcm-ventas) está activa y recibiendo mensajes.
            </p>
          </div>
        ) : qrCodeVentas ? (
          <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-2">Escanea el Código QR</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
              Abre WhatsApp en tu teléfono, ve a Dispositivos Vinculados y escanea este código.
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
              <Image 
                src={qrCodeVentas} 
                alt="WhatsApp QR Code" 
                width={250} 
                height={250}
                className="w-48 h-48 md:w-64 md:h-64 object-contain"
                unoptimized
              />
            </div>
            <button 
              onClick={generarQRVentas}
              disabled={cargandoVentas}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${cargandoVentas ? 'animate-spin' : ''}`} />
              Refrescar QR
            </button>
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Aún no has conectado WhatsApp Ventas</h3>
            <p className="text-sm text-gray-500 mb-6">
              Genera un código QR para vincular tu dispositivo móvil y activar el CRM.
            </p>
            <button 
              onClick={generarQRVentas}
              disabled={cargandoVentas}
              className="bg-lime-500 hover:bg-lime-400 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 mx-auto transition-colors disabled:opacity-50"
            >
              {cargandoVentas ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Conectando API...</>
              ) : (
                <><Smartphone className="w-5 h-5" /> Generar Código QR</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
