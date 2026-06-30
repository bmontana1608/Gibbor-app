'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Users as UsersIcon, ShieldAlert, KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function UsuariosPage() {
  const [usuariosGlobales, setUsuariosGlobales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ newPassword: '', newEmail: '' });
  const [adminFormData, setAdminFormData] = useState({ nombres: '', apellidos: '', email: '', password: '' });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    const { data } = await supabase.from('perfiles').select('*').limit(50);
    setUsuariosGlobales(data || []);
    setLoading(false);
  };

  const handleManageUser = async (action: 'RESET_PASSWORD' | 'CHANGE_EMAIL') => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/governance/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId: selectedUser.id, action, payload: userFormData }) 
      });
      if (!response.ok) throw new Error('Error en la operación');
      toast.success('Operación exitosa'); 
      setShowUserModal(false); 
      setUserFormData({ newPassword: '', newEmail: '' });
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    try {
      const response = await fetch('/api/admin/governance/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'CREATE_ADMIN', payload: adminFormData }) 
      });
      if (!response.ok) throw new Error('Error al crear administrador');
      toast.success('Nuevo SuperAdmin creado'); 
      setShowCreateAdminModal(false);
      setAdminFormData({ nombres: '', apellidos: '', email: '', password: '' }); 
      cargarUsuarios();
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <UsersIcon className="text-blue-500" /> Gobernanza de Usuarios
          </h2>
          <p className="text-sm text-gray-500 mt-1">Control maestro de identidades del sistema Multi-tenant</p>
        </div>
        <button onClick={() => setShowCreateAdminModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg text-sm">
          <ShieldCheck size={18} /> Crear SuperAdmin
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden border-t-4 border-t-red-500">
        {loading && usuariosGlobales.length === 0 ? (
          <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50/50 border-b border-red-100">
                <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Usuario</th>
                  <th className="text-left px-6 py-4">Rol / Nivel</th>
                  <th className="text-left px-6 py-4">Tenant ID (Club)</th>
                  <th className="text-right px-6 py-4">Gobernanza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuariosGlobales.map(u => (
                  <tr key={u.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{u.nombre_completo || 'Sin Nombre'}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1" title={u.id}>ID: {u.id.split('-')[0]}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        u.rol?.toLowerCase() === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                        u.rol?.toLowerCase() === 'director' ? 'bg-blue-100 text-blue-700' :
                        u.rol?.toLowerCase() === 'entrenador' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {u.rol || 'Jugador/Padre'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.tenant_id ? (
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">{u.tenant_id}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Global System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedUser(u); setShowUserModal(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ShieldAlert size={14} /> Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-red-200">
            <div className="bg-red-500 p-6 text-white">
              <h3 className="text-xl font-black flex items-center gap-2"><ShieldAlert /> Gobernanza de Identidad</h3>
              <p className="text-red-100 text-sm mt-1">Modificando credenciales de: {selectedUser.nombre_completo}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-orange-800 leading-relaxed font-medium">Estas acciones modifican la identidad base en Supabase Auth. El usuario será desconectado y sus credenciales cambiarán permanentemente.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Cambiar Contraseña</label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="password" value={userFormData.newPassword} onChange={e => setUserFormData({...userFormData, newPassword: e.target.value})} placeholder="Nueva contraseña..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" />
                  </div>
                  <button onClick={() => handleManageUser('RESET_PASSWORD')} disabled={!userFormData.newPassword || loading} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50">Forzar</button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase">Cambiar Correo Base</label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="email" value={userFormData.newEmail} onChange={e => setUserFormData({...userFormData, newEmail: e.target.value})} placeholder="Nuevo correo..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" />
                  </div>
                  <button onClick={() => handleManageUser('CHANGE_EMAIL')} disabled={!userFormData.newEmail || loading} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">Cambiar</button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowUserModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors">Cerrar Panel</button>
            </div>
          </div>
        </div>
      )}

      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <h3 className="text-xl font-black flex items-center gap-2"><ShieldCheck /> Nuevo SuperAdmin</h3>
              <p className="text-slate-400 text-sm mt-1">Otorgar acceso total al sistema MCM</p>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Nombres</label><input type="text" required value={adminFormData.nombres} onChange={e => setAdminFormData({...adminFormData, nombres: e.target.value})} className="w-full p-3 border rounded-xl text-sm bg-gray-50" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label><input type="text" required value={adminFormData.apellidos} onChange={e => setAdminFormData({...adminFormData, apellidos: e.target.value})} className="w-full p-3 border rounded-xl text-sm bg-gray-50" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</label><input type="email" required value={adminFormData.email} onChange={e => setAdminFormData({...adminFormData, email: e.target.value})} className="w-full p-3 border rounded-xl text-sm bg-gray-50" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Contraseña Segura</label><input type="password" required minLength={8} value={adminFormData.password} onChange={e => setAdminFormData({...adminFormData, password: e.target.value})} className="w-full p-3 border rounded-xl text-sm bg-gray-50" /></div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateAdminModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-slate-900 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
