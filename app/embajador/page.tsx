import { createClient } from '@/lib/supabase/server';
import { ArrowUpRight, Copy, Download, Users, Wallet, Trophy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default async function EmbajadorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Obtener perfil del embajador
  const { data: embajador } = await supabase
    .from('embajadores')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  if (!embajador) return <div>No se encontró tu perfil de embajador.</div>;

  // 2. Obtener estadísticas (Clubes Referidos)
  const { data: clubes } = await supabase
    .from('clubes')
    .select('id, nombre, estado_referido, tarifa_por_jugador, cuota_fija, perfiles(count)')
    .eq('embajador_id', embajador.id);

  const totalClubes = clubes?.length || 0;
  const clubesActivos = clubes?.filter(c => c.estado_referido === 'Cliente Activo').length || 0;
  
  // Calcular MRR aproximado (Suma de cuota_fija de clientes activos)
  const mrr = clubes?.filter(c => c.estado_referido === 'Cliente Activo').reduce((sum, club) => sum + (club.cuota_fija || 0), 0) || 0;

  // 3. Obtener comisiones
  const { data: comisiones } = await supabase
    .from('comisiones')
    .select('monto, estado')
    .eq('embajador_id', embajador.id);

  const comisionesTotales = comisiones?.reduce((sum, c) => sum + Number(c.monto), 0) || 0;
  const comisionesPagadas = comisiones?.filter(c => c.estado === 'Pagada').reduce((sum, c) => sum + Number(c.monto), 0) || 0;
  const comisionesPendientes = comisionesTotales - comisionesPagadas;

  // 4. URL de referido
  const referralUrl = `https://masterclubmanager.com/registro-club?ref=${embajador.codigo_referido}`;

  return (
    <div className="space-y-8 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hola, {embajador.nombre_completo.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 font-medium mt-1">Aquí está el resumen de tu gestión comercial.</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2 shadow-sm">
          <span className="text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">Tu Código:</span>
          <span className="bg-green-100 text-green-700 font-black px-3 py-1.5 rounded-lg text-lg tracking-wider">
            {embajador.codigo_referido}
          </span>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="MRR Generado" 
          value={`$${mrr.toLocaleString('es-CO')}`}
          subtitle="Valor recurrente mensual"
          icon={<Trophy className="w-6 h-6 text-yellow-500" />}
          bg="bg-yellow-50"
        />
        <MetricCard 
          title="Clubes Activos" 
          value={clubesActivos.toString()}
          subtitle={`De ${totalClubes} referidos en total`}
          icon={<Users className="w-6 h-6 text-blue-500" />}
          bg="bg-blue-50"
        />
        <MetricCard 
          title="Comisiones Totales" 
          value={`$${comisionesTotales.toLocaleString('es-CO')}`}
          subtitle="Histórico generado"
          icon={<Wallet className="w-6 h-6 text-green-500" />}
          bg="bg-green-50"
        />
        <MetricCard 
          title="Por Cobrar" 
          value={`$${comisionesPendientes.toLocaleString('es-CO')}`}
          subtitle="En proceso de pago"
          icon={<DollarSign className="w-6 h-6 text-red-500" />}
          bg="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KIT COMERCIAL (QR Y LINK) */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Tu Kit Comercial</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Comparte este enlace o el código QR con cualquier academia. Si se registran, quedarán asociados a tu cuenta.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 w-full">
            <QRCodeSVG value={referralUrl} size={180} className="mx-auto" />
          </div>

          <div className="w-full space-y-3 mt-auto">
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
              <Copy className="w-4 h-4" /> Copiar Link
            </button>
          </div>
        </div>

        {/* ÚLTIMOS REFERIDOS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6">Últimos Referidos</h2>
          
          {totalClubes === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 font-medium">Aún no tienes clubes referidos.</p>
              <p className="text-sm text-slate-400 mt-1">Comparte tu código para empezar a ganar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Club</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Tarifa Aprox</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clubes?.slice(0, 5).map(club => (
                    <tr key={club.id}>
                      <td className="py-4 font-bold text-slate-900">{club.nombre}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${
                          club.estado_referido === 'Cliente Activo' ? 'bg-green-100 text-green-700' :
                          club.estado_referido === 'Registrado' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {club.estado_referido || 'Registrado'}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium text-slate-500">
                        ${(club.cuota_fija || 0).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, bg }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500">{title}</h3>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-2">{subtitle}</p>
    </div>
  );
}
