'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Lock, Eye, EyeOff, Save, Zap } from "lucide-react";
import { toast } from "sonner";

export default function PerfilFutbolista() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("La clave debe tener al menos 6 caracteres");
    if (newPassword !== confirmPassword) return toast.error("Las claves no coinciden");

    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("¡Contraseña actualizada correctamente! ✨");
      setNewPassword("");
      setConfirmPassword("");
    }
    setCargando(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">MI SEGURIDAD</h1>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Gestiona tus credenciales de acceso</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
           <Zap className="absolute right-[-20px] top-[-20px] w-40 h-40 text-white/5 rotate-12" />
           <h2 className="text-xl font-bold relative z-10">Cambiar Contraseña</h2>
           <p className="text-slate-400 text-sm relative z-10 mt-1">Elige una clave que puedas recordar fácilmente.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
          <div className="space-y-4">
             <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 transition-all"
                    placeholder="Min. 6 caracteres"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
             </div>

             <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700 transition-all"
                    placeholder="Repite tu nueva clave"
                  />
                </div>
             </div>
          </div>

          <div className="pt-4 pb-2">
            <button 
              type="submit"
              disabled={cargando}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3"
            >
              {cargando ? "Actualizando..." : <><Save className="w-5 h-5" /> Guardar Nueva Clave</>}
            </button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
             <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
             <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase tracking-tight">
               Si cambias tu clave, el Director podrá restablecerla a la clave institucional si vuelves a perder el acceso.
             </p>
          </div>
        </form>
      </div>
    </div>
  );
}
