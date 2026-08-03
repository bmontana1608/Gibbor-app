'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, User, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function MiCuentaPage() {
  const [miCuentaData, setMiCuentaData] = useState({ newEmail: '', newPassword: '', confirmPassword: '' });
  const [miCuentaLoading, setMiCuentaLoading] = useState(false);

  const handleUpdateMiCuenta = async (tipo: 'email' | 'password') => {
    if (tipo === 'password' && miCuentaData.newPassword !== miCuentaData.confirmPassword) {
      toast.error('Las contraseñas no coinciden'); return;
    }
    setMiCuentaLoading(true);
    
    try {
      const updates: any = {};
      if (tipo === 'email') updates.email = miCuentaData.newEmail;
      if (tipo === 'password') updates.password = miCuentaData.newPassword;
      
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw new Error(error.message);
      
      toast.success(tipo === 'email' ? 'Correo actualizado. Revisa tu bandeja para confirmar.' : 'Contraseña actualizada correctamente');
      setMiCuentaData({ newEmail: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setMiCuentaLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-lg">
      <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2"><User className="text-slate-500" /> Mi Cuenta</h2>
      <p className="text-sm text-gray-500 mb-6">Actualiza tus credenciales de acceso como SuperAdmin.</p>

      {/* Cambiar Email */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Mail size={18} /></div>
          <div>
            <h3 className="font-bold text-slate-800">Cambiar Correo Electrónico</h3>
            <p className="text-xs text-gray-500 mt-0.5">La actualización requerirá verificación.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Nuevo Correo</label>
            <input 
              type="email" 
              value={miCuentaData.newEmail} 
              onChange={e => setMiCuentaData({...miCuentaData, newEmail: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none bg-gray-50"
              placeholder="admin@ejemplo.com"
            />
          </div>
          <button 
            onClick={() => handleUpdateMiCuenta('email')}
            disabled={!miCuentaData.newEmail || miCuentaLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {miCuentaLoading && miCuentaData.newEmail ? <Loader2 size={16} className="animate-spin" /> : null}
            Actualizar Correo
          </button>
        </div>
      </div>

      {/* Cambiar Password */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600"><KeyRound size={18} /></div>
          <div>
            <h3 className="font-bold text-slate-800">Cambiar Contraseña</h3>
            <p className="text-xs text-gray-500 mt-0.5">Utiliza al menos 8 caracteres.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Nueva Contraseña</label>
            <input 
              type="password" 
              value={miCuentaData.newPassword} 
              onChange={e => setMiCuentaData({...miCuentaData, newPassword: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-violet-400 outline-none bg-gray-50"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Confirmar Contraseña</label>
            <input 
              type="password" 
              value={miCuentaData.confirmPassword} 
              onChange={e => setMiCuentaData({...miCuentaData, confirmPassword: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-violet-400 outline-none bg-gray-50"
              placeholder="••••••••"
            />
          </div>
          <button 
            onClick={() => handleUpdateMiCuenta('password')}
            disabled={!miCuentaData.newPassword || !miCuentaData.confirmPassword || miCuentaLoading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {miCuentaLoading && miCuentaData.newPassword ? <Loader2 size={16} className="animate-spin" /> : null}
            Actualizar Contraseña
          </button>
        </div>
      </div>
    </div>
  );
}
