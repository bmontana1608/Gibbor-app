'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Settings, Bot, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    const { data } = await supabase.from('configuracion_superadmin').select('*').eq('id', 1).maybeSingle();
    setConfigAdmin(data || {});
    setLoading(false);
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

      <h3 className="font-bold text-slate-800 mb-4 border-t pt-6 flex items-center gap-2"><Bot size={18} /> Inteligencia Artificial (Gibbi)</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Clave API de Gemini</label>
        <div className="flex gap-2">
          <input 
            type="password" 
            placeholder="AIzaSy..." 
            value={configAdmin.gemini_api_key || ''} 
            onChange={e => setConfigAdmin({...configAdmin, gemini_api_key: e.target.value})}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none bg-gray-50"
          />
          <button 
            onClick={() => guardarConfiguracion('gemini_api_key', configAdmin.gemini_api_key, 'API Key guardada. Gibbi ya puede funcionar.')}
            className="bg-lime-500 hover:bg-lime-400 text-white font-bold px-6 rounded-xl transition-colors"
          >
            Guardar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Si está vacío, Gibbi no responderá mensajes generativos a los clubes.</p>
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
    </div>
  );
}
