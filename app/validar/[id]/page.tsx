import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, XCircle, User, ShieldCheck, MapPin, Activity, Droplet } from 'lucide-react';

export default async function ValidarCarnetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar perfil
  const { data: perfil, error: pError } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .eq('id', id)
    .single();

  if (pError || !perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-200">
          <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">Carnet Inválido</h1>
          <p className="text-slate-500">Carnet no encontrado o ID inválido.</p>
        </div>
      </div>
    );
  }

  // Buscar club
  let club = null;
  if (perfil.club_id) {
    const { data: cData } = await supabaseAdmin
      .from('clubes')
      .select('*')
      .eq('id', perfil.club_id)
      .single();
    if (cData) club = cData;
  }

  const isActive = perfil.estado_miembro === 'Activo';
  const brandColor = club?.brand_color || '#3b82f6';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-slate-200">
        {/* Encabezado */}
        <div 
          className="h-32 relative flex items-center justify-center p-6"
          style={{ backgroundColor: brandColor }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col items-center">
            {club?.logo_url ? (
              <img src={club.logo_url} alt="Club" className="w-16 h-16 object-contain drop-shadow-lg mb-2" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-white mb-2" />
            )}
            <h2 className="text-white font-black italic uppercase tracking-wider text-sm text-center mt-2">
              {club?.nombre || 'Verificación Deportiva'}
            </h2>
          </div>
        </div>

        {/* Info del Jugador */}
        <div className="px-6 pt-24 pb-8 relative text-center">
          {/* Foto */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <div className="w-32 h-32 bg-white rounded-2xl border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {perfil.foto_url ? (
                <img src={perfil.foto_url} alt={perfil.nombres} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-300" />
              )}
            </div>
            {/* Badge de estado */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              {isActive ? (
                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVO
                </span>
              ) : (
                <span className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> INACTIVO
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mt-2 uppercase">{perfil.nombres}</h1>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{perfil.apellidos}</h2>

          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Documento
                </p>
                <p className="font-bold text-slate-700 text-sm break-words leading-tight">{perfil.documento_identidad || 'N/A'}</p>
             </div>
             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Categoría
                </p>
                <p className="font-bold text-slate-700 text-sm break-words leading-tight">{perfil.grupos || 'Sin asignar'}</p>
             </div>
             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Droplet className="w-3 h-3" /> RH / Sangre
                </p>
                <p className="font-bold text-slate-700 text-sm break-words leading-tight">{perfil.tipo_sangre || 'N/A'}</p>
             </div>
             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> EPS
                </p>
                <p className="font-bold text-slate-700 text-sm break-words leading-tight">{perfil.eps || 'N/A'}</p>
             </div>
          </div>

          {/* Sello de seguridad */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            {isActive ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
                <p className="text-xs font-bold uppercase tracking-wider">Identidad Verificada Oficialmente</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 rounded-lg p-3 border border-rose-100">
                <XCircle className="w-5 h-5" />
                <p className="text-xs font-bold uppercase tracking-wider">Jugador No Autorizado (Inactivo)</p>
              </div>
            )}
            <p className="text-[9px] font-medium text-slate-400 mt-4 uppercase tracking-[0.3em]">
              Powered by Master Club Manager
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
