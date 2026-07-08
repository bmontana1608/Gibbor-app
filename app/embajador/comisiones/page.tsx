import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Wallet, CheckCircle2, Clock } from 'lucide-react';

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }> | { id?: string };
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

  const { data: comisiones } = await supabase
    .from('comisiones')
    .select('*, clubes(nombre)')
    .eq('embajador_id', embajador.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tus Comisiones 💰</h1>
        <p className="text-slate-500 font-medium mt-1">Historial de pagos y comisiones pendientes.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        {(!comisiones || comisiones.length === 0) ? (
           <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Aún no tienes comisiones registradas.</p>
           </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-100">
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Club</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                   <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Monto</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {comisiones.map(com => (
                   <tr key={com.id}>
                     <td className="py-4 text-sm font-medium text-slate-600">
                       {new Date(com.created_at).toLocaleDateString('es-CO')}
                     </td>
                     <td className="py-4 font-bold text-slate-900">
                       {(com.clubes as any)?.nombre || 'Club no encontrado'}
                     </td>
                     <td className="py-4">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg ${
                         com.estado === 'Pagada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                       }`}>
                         {com.estado === 'Pagada' ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                         {com.estado}
                       </span>
                     </td>
                     <td className="py-4 text-right font-black text-slate-900">
                       ${Number(com.monto).toLocaleString('es-CO')}
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
