import { createClient } from '@/lib/supabase/server';
import { ArrowUpRight, Copy, Download, Users, Wallet, Trophy, DollarSign, Target, CheckCircle2 } from 'lucide-react';
import CopyButton from './CopyButton';
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

  // 4. Calcular Nivel de Gamificación (basado en clubes ACTIVOS)
  let nivel = 'Bronce';
  let porcentaje = 10;
  let siguienteNivel = 'Plata';
  let metaSiguiente = 3;

  if (clubesActivos >= 6) {
    nivel = 'Oro';
    porcentaje = 20;
    siguienteNivel = 'MAX';
    metaSiguiente = clubesActivos;
  } else if (clubesActivos >= 3) {
    nivel = 'Plata';
    porcentaje = 15;
    siguienteNivel = 'Oro';
    metaSiguiente = 6;
  }

  const progreso = nivel === 'Oro' ? 100 : Math.min(100, Math.round((clubesActivos / metaSiguiente) * 100));

  // 5. URLs de referido con fuente
  const baseUrl = `https://masterclubmanager.com/registro-club?ref=${embajador.codigo_referido}`;
  const referralUrlLink = `${baseUrl}&src=link`;
  const referralUrlQr = `${baseUrl}&src=qr`;

  // 6. Tasa de Conversión
  const leadsTotales = totalClubes;
  const tasaConversion = leadsTotales > 0 ? Math.round((clubesActivos / leadsTotales) * 100) : 0;

  // 7. Actualizar última actividad
  await supabase.from('embajadores').update({ ultima_actividad: new Date().toISOString() }).eq('id', embajador.id);

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

      {/* GAMIFICACIÓN BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <Trophy className={`w-8 h-8 ${nivel === 'Oro' ? 'text-yellow-400' : nivel === 'Plata' ? 'text-slate-300' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 uppercase tracking-widest mb-1">Nivel Actual</p>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">{nivel}</h2>
              <span className="text-lime-400 font-bold mb-1">({porcentaje}% comisión)</span>
            </div>
          </div>
        </div>

        {nivel !== 'Oro' && (
          <div className="w-full md:w-1/3 bg-black/30 rounded-2xl p-4 border border-white/10">
            <div className="flex justify-between text-sm font-medium text-slate-300 mb-2">
              <span>{clubesActivos} Activos</span>
              <span>Faltan {metaSiguiente - clubesActivos} para {siguienteNivel}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-lime-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progreso}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {nivel === 'Oro' && (
          <div className="w-full md:w-1/3 bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20 text-center">
            <p className="text-yellow-400 font-bold text-sm">🏆 ¡Alcanzaste el nivel máximo!</p>
            <p className="text-xs text-yellow-500/80 mt-1">Ganas la comisión tope en todos tus referidos.</p>
          </div>
        )}
      </div>

      {/* MÉTRICAS DE CONVERSIÓN Y FINANCIERAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Leads" value={leadsTotales} subtitle="Academias registradas" icon={<Users className="w-6 h-6 text-blue-500" />} bg="bg-blue-100" />
        <MetricCard title="Activos" value={clubesActivos} subtitle="Clientes pagando" icon={<CheckCircle2 className="w-6 h-6 text-green-500" />} bg="bg-green-100" />
        <MetricCard title="Conversión" value={`${tasaConversion}%`} subtitle="Tasa de éxito" icon={<Target className="w-6 h-6 text-orange-500" />} bg="bg-orange-100" />
        <MetricCard title="MRR Estimado" value={`$${mrr.toLocaleString('es-CO')}`} subtitle="Ingreso recurrente" icon={<DollarSign className="w-6 h-6 text-indigo-500" />} bg="bg-indigo-100" />
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

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 w-full flex justify-center">
            <QRCodeSVG value={referralUrlQr} size={180} />
          </div>

          <div className="w-full space-y-3 mt-auto">
            <CopyButton text={referralUrlLink} />
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
