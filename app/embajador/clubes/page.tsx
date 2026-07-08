import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';

export default async function MisClubesPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  const queryId = (await searchParams)?.id;

  let embajador;
  if (perfil?.rol === 'SuperAdmin' && queryId) {
    const { data } = await supabase
      .from('embajadores')
      .select('id')
      .eq('id', queryId)
      .single();
    embajador = data;
  } else {
    const { data } = await supabase
      .from('embajadores')
      .select('id')
      .eq('user_id', user.id)
      .single();
    embajador = data;
  }

  if (!embajador) return redirect('/master');

  const { data: clubes } = await supabase
    .from('clubes')
    .select('id, nombre, estado_referido, tarifa_por_jugador, created_at, ciudad, perfiles(count)')
    .eq('embajador_id', embajador.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Referidos 🤝</h1>
        <p className="text-slate-500 font-medium mt-1">Academias y clubes deportivos que han usado tu código.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        {(!clubes || clubes.length === 0) ? (
           <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Aún no has referido a ningún club.</p>
           </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-100">
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Fecha Registro</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Club</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Ubicación</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Tarifa (MRR)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {clubes.map(club => (
                   <tr key={club.id}>
                     <td className="py-4 text-sm font-medium text-slate-600">
                       {new Date(club.created_at).toLocaleDateString('es-CO')}
                     </td>
                     <td className="py-4 font-bold text-slate-900">
                       {club.nombre}
                     </td>
                     <td className="py-4 text-sm text-slate-500">
                       {club.ciudad || 'No especificada'}
                     </td>
                     <td className="py-4">
                       <span className={`px-2 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${
                          club.estado_referido === 'Cliente Activo' ? 'bg-green-100 text-green-700' :
                          club.estado_referido === 'Registrado' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {club.estado_referido || 'Registrado'}
                       </span>
                     </td>
                     <td className="py-4 text-right font-black text-slate-900">
                       ${(() => {
                         if (club.estado_referido !== 'Cliente Activo') return 0;
                         const basePlan = 100000;
                         const totalJugadores = club.perfiles && club.perfiles[0] ? club.perfiles[0].count : 0;
                         const jugadoresExtra = Math.max(0, totalJugadores - 60);
                         const mrrDelClub = basePlan + (jugadoresExtra * 2000);
                         return (mrrDelClub * 0.10).toLocaleString('es-CO');
                       })()}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
}
