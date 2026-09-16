'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Settings, Bot, LifeBuoy, Smartphone, Zap, RefreshCw, CheckCircle2, Plus, Trash2, Sparkles, Key, Eye, EyeOff, Play, CreditCard, Wallet } from 'lucide-react';
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

  // Canales de Pago SuperAdmin para Cuentas de Cobro y Facturas SaaS
  const [canalesPago, setCanalesPago] = useState({
    banco_nombre: '',
    banco_numero: '',
    nequi: '',
    daviplata: '',
    bre_b: '',
    titular: '',
    nit_titular: '',
    instrucciones_adicionales: ''
  });
  const [guardandoCanales, setGuardandoCanales] = useState(false);
  const [guardandoCampo, setGuardandoCampo] = useState<string | null>(null);

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

    let configData: any = null;
    try {
      const resApi = await fetch('/api/admin/configuracion', { cache: 'no-store' });
      if (resApi.ok) {
        const json = await resApi.json();
        if (json.data) configData = json.data;
      }
    } catch (_) {}

    if (!configData) {
      const { data } = await supabase.from('configuracion_superadmin').select('*').order('id', { ascending: true }).limit(1).maybeSingle();
      configData = data;
    }

    setConfigAdmin(configData || {});

    let canales = configData?.canales_pago;
    if (!canales && configData?.mensaje_cobro) {
      try {
        const parsed = JSON.parse(configData.mensaje_cobro);
        if (parsed && typeof parsed === 'object') {
          canales = parsed.canales_pago || parsed;
        }
      } catch (_) {}
    }

    if (canales && typeof canales === 'object') {
      setCanalesPago({
        banco_nombre: canales.banco_nombre || '',
        banco_numero: canales.banco_numero || '',
        nequi: canales.nequi || '',
        daviplata: canales.daviplata || '',
        bre_b: canales.bre_b || '',
        titular: canales.titular || '',
        nit_titular: canales.nit_titular || '',
        instrucciones_adicionales: canales.instrucciones_adicionales || ''
      });
    }

    // Cargar pool de claves de Gemini
    const keys: string[] = [];
    if (Array.isArray(configData?.gemini_api_keys)) {
      keys.push(...configData.gemini_api_keys);
    } else if (typeof configData?.gemini_api_keys === 'string') {
      try {
        const p = JSON.parse(configData.gemini_api_keys);
        if (Array.isArray(p)) keys.push(...p);
      } catch {
        keys.push(...configData.gemini_api_keys.split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean));
      }
    }
    if (keys.length === 0 && configData?.gemini_api_key) {
      keys.push(configData.gemini_api_key);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar claves en la base de datos.');
      setConfigAdmin((prev: any) => ({ ...prev, gemini_api_keys: limpias, gemini_api_key: limpias[0] || '' }));
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

  const guardarCanalesPago = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGuardandoCanales(true);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canales_pago: canalesPago })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar canales de pago.');
      setConfigAdmin((prev: any) => ({ ...prev, canales_pago: canalesPago }));
      toast.success('¡Canales de pago actualizados exitosamente!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoCanales(false);
    }
  };

  const guardarConfiguracion = async (campo: string, valor: string, mensajeExito: string) => {
    setGuardandoCampo(campo);
    try {
      const payload: any = {};
      payload[campo] = valor;
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar en la base de datos.');
      setConfigAdmin((prev: any) => ({ ...prev, [campo]: valor }));
      toast.success(mensajeExito);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoCampo(null);
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
            type="button"
            disabled={guardandoCampo === 'telefono_soporte'}
            onClick={() => guardarConfiguracion('telefono_soporte', configAdmin.telefono_soporte, 'Teléfono actualizado')}
            className="bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-white font-bold px-6 rounded-xl transition-colors flex items-center justify-center gap-2 min-w-[110px]"
          >
            {guardandoCampo === 'telefono_soporte' ? <Loader2 size={16} className="animate-spin" /> : null}
            {guardandoCampo === 'telefono_soporte' ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">A este número se redirigirán los clubes suspendidos por mora.</p>
      </div>

      {/* CANALES Y MÉTODOS DE PAGO OFICIALES (COBRO SAAS WHATSAPP Y PDF) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-100 flex items-center justify-center text-lime-700">
              <CreditCard size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Métodos de Pago Oficiales (SaaS)</h4>
              <p className="text-xs text-gray-500">Estos canales se insertan automáticamente en los mensajes de WhatsApp y en los PDFs de Cuentas de Cobro enviados a los directores de los clubes.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Banco y Tipo de Cuenta</label>
              <input 
                type="text" 
                placeholder="Ej: Bancolombia Ahorros"
                value={canalesPago.banco_nombre || ''} 
                onChange={e => setCanalesPago({...canalesPago, banco_nombre: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Número de Cuenta</label>
              <input 
                type="text" 
                placeholder="Ej: 3124265170"
                value={canalesPago.banco_numero || ''} 
                onChange={e => setCanalesPago({...canalesPago, banco_numero: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Nequi</label>
              <input 
                type="text" 
                placeholder="Ej: 3124265170"
                value={canalesPago.nequi || ''} 
                onChange={e => setCanalesPago({...canalesPago, nequi: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Daviplata</label>
              <input 
                type="text" 
                placeholder="Ej: 3124265170"
                value={canalesPago.daviplata || ''} 
                onChange={e => setCanalesPago({...canalesPago, daviplata: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Llave Bre-B / Transfiya</label>
              <input 
                type="text" 
                placeholder="Ej: 3124265170"
                value={canalesPago.bre_b || ''} 
                onChange={e => setCanalesPago({...canalesPago, bre_b: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Titular de la Cuenta</label>
              <input 
                type="text" 
                placeholder="Ej: Master Club Manager"
                value={canalesPago.titular || ''} 
                onChange={e => setCanalesPago({...canalesPago, titular: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">NIT o Cédula (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej: 901.234.567-8"
                value={canalesPago.nit_titular || ''} 
                onChange={e => setCanalesPago({...canalesPago, nit_titular: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Instrucciones Adicionales (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Enviar comprobante con el nombre de la academia y mes a cancelar."
              value={canalesPago.instrucciones_adicionales || ''} 
              onChange={e => setCanalesPago({...canalesPago, instrucciones_adicionales: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-lime-400 outline-none bg-gray-50 font-medium"
            />
          </div>

          {/* Vista previa en vivo del formato que saldrá en el mensaje */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Wallet size={12} className="text-lime-600" />
              Vista Previa del Bloque de Cobro en WhatsApp:
            </p>
            <div className="font-mono text-xs text-slate-700 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200">
              {(() => {
                const preview = [
                  `💳 *Canales de Pago Oficiales:*`,
                  canalesPago.banco_nombre && canalesPago.banco_numero ? `• ${canalesPago.banco_nombre}: *${canalesPago.banco_numero}*` : '',
                  canalesPago.nequi ? `• Nequi: *${canalesPago.nequi}*` : '',
                  canalesPago.daviplata ? `• Daviplata: *${canalesPago.daviplata}*` : '',
                  canalesPago.bre_b ? `• Llave Bre-B: *${canalesPago.bre_b}*` : '',
                  canalesPago.titular ? `• Titular: *${canalesPago.titular}*` : '',
                  canalesPago.nit_titular ? `• NIT / Doc: *${canalesPago.nit_titular}*` : '',
                  canalesPago.instrucciones_adicionales ? `• Nota: ${canalesPago.instrucciones_adicionales}` : ''
                ].filter(Boolean).join('\n');
                return preview;
              })()}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button"
              onClick={() => guardarCanalesPago()}
              disabled={guardandoCanales}
              className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {guardandoCanales ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Guardar Métodos de Pago
            </button>
          </div>
        </div>
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
            type="button"
            disabled={guardandoCampo === 'slack_webhook_url'}
            onClick={() => guardarConfiguracion('slack_webhook_url', configAdmin.slack_webhook_url, 'Webhook de Slack guardado.')}
            className="bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-white font-bold px-6 rounded-xl transition-colors flex items-center justify-center gap-2 min-w-[110px]"
          >
            {guardandoCampo === 'slack_webhook_url' ? <Loader2 size={16} className="animate-spin" /> : null}
            {guardandoCampo === 'slack_webhook_url' ? 'Guardando...' : 'Guardar'}
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
