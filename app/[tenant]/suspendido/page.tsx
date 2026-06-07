import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AlertCircle, LogOut, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function SuspendidoPage({ params }: any) {
  const { tenant } = await params;
  const supabase = await createClient();

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect(`/${tenant}/login`);
  }

  // 2. Obtener datos del club
  const { data: club } = await supabase
    .from('clubes')
    .select('id, nombre, estado_suscripcion, fecha_fin_prueba, tarifa_por_jugador, logo_url')
    .eq('slug', tenant)
    .single();

  if (!club) {
    return redirect('/');
  }

  // 3. Obtener configuración global (teléfono de WhatsApp)
  const { data: configAdmin } = await supabase
    .from('configuracion_superadmin')
    .select('telefono_soporte')
    .single();
  
  const wppNumber = configAdmin?.telefono_soporte || '+573124265170';
  const cleanNumber = wppNumber.replace(/[^0-9]/g, '');

  // 4. Calcular precio a mostrar
  const tarifaBase = Number(club.tarifa_por_jugador || 2000);

  // 5. Verificar si realmente está suspendido (Si pagaron y entraron aquí por error, pueden salir)
  let isSuspended = club.estado_suscripcion === 'Suspendido';
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const enPrueba = club.fecha_fin_prueba && new Date(club.fecha_fin_prueba) >= hoy;

  if (!enPrueba && diaActual > 10) {
    const { data: facturas } = await supabase
      .from('facturacion_mensual')
      .select('estado_pago')
      .eq('club_id', club.id)
      .eq('periodo_mes', hoy.getMonth() + 1)
      .eq('periodo_anio', hoy.getFullYear())
      .limit(1);
    
    if (!facturas?.[0] || facturas[0].estado_pago !== 'pagado') {
       isSuspended = true;
    } else {
       // Si tienen la factura del mes pagada, no están suspendidos (solo por mora)
       // Pero si el Admin manualmente lo suspendió, se mantiene.
    }
  }

  if (!isSuspended && !enPrueba && diaActual <= 10) {
    // Si no es > 10 y no ha sido suspendido manualmente, redirigir al home
    if (club.estado_suscripcion !== 'Suspendido') {
      return redirect(`/${tenant}/director`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-300 font-sans">
      
      {/* HEADER LOGO */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Image src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" alt="MCM" width={40} height={40} className="rounded-xl" />
          <span className="text-white font-black text-xl tracking-tight">Master Club Manager</span>
        </div>
        <div className="flex items-center gap-4">
           <form action="/api/auth/signout" method="post">
              <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                 <LogOut className="w-4 h-4" />
                 Cerrar sesión
              </button>
           </form>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        
        {/* BANNER ROJO DE SUSPENSIÓN */}
        <div className="bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-900/50 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
           <div className="bg-red-500/20 text-red-500 p-4 rounded-full flex-shrink-0 relative z-10 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
           </div>
           <div className="text-center sm:text-left relative z-10 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Tu club está inactivo</h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                La suscripción de <strong>{club.nombre}</strong> se encuentra suspendida por falta de pago o fin del periodo de prueba. 
                Puedes reactivar los servicios realizando el pago de tu factura o contactando a nuestro equipo.
              </p>
           </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <a 
             href={`https://wa.me/${cleanNumber}?text=Hola,%20soy%20del%20club%20${encodeURIComponent(club.nombre)}.%20Quiero%20ponerme%20al%20d%C3%ADa%20con%20mi%20suscripci%C3%B3n.`}
             target="_blank"
             rel="noopener noreferrer"
             className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
           >
              Contactar por WhatsApp
           </a>
           <Link 
             href={`/${tenant}/director`} 
             className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2 border border-slate-700"
           >
              Verificar estado
           </Link>
        </div>

        {/* PLANES SAAS */}
        <div className="mt-12 pt-8 border-t border-slate-800">
           <div className="text-center mb-8">
             <h2 className="text-xl font-bold text-white">Renueva tu suscripción</h2>
             <p className="text-slate-400 text-sm mt-1">El mejor sistema para la gestión de tu club</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PLAN MENSUAL */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 sm:p-8 hover:border-slate-600 transition-colors">
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Pago Mensual</p>
                 <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-white">$ {tarifaBase.toLocaleString('es-CO')}</span>
                    <span className="text-slate-500 text-sm">COP por deportista/mes</span>
                 </div>
                 
                 <ul className="space-y-4 mt-8">
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                       <span className="text-sm text-slate-300">Paga solo lo que necesitas (según tus jugadores activos)</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                       <span className="text-sm text-slate-300">Soporte directo</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                       <span className="text-sm text-slate-300">Flexibilidad total: cancela cuando quieras</span>
                    </li>
                 </ul>
              </div>

              {/* PLAN ANUAL */}
              <div className="bg-slate-900 border border-brand/50 rounded-2xl p-6 sm:p-8 relative shadow-2xl shadow-brand/10">
                 <div className="absolute -top-3 right-6 bg-brand text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                   Más Popular
                 </div>
                 
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 text-brand">PAGO ANUAL (Consulta descuento)</p>
                 <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-white">Anualidad</span>
                 </div>
                 
                 <ul className="space-y-4 mt-8">
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />
                       <span className="text-sm text-slate-300">Congela tu precio: no importa cuántos deportistas crezcas</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />
                       <span className="text-sm text-slate-300">Ahorro garantizado</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />
                       <span className="text-sm text-white font-bold">Renueva solo una vez al año</span>
                    </li>
                 </ul>
                 
                 <a 
                   href={`https://wa.me/${cleanNumber}?text=Me%20interesa%20el%20plan%20ANUAL%20para%20el%20club%20${encodeURIComponent(club.nombre)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-full mt-8 bg-brand hover:bg-orange-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                    Consultar Plan Anual
                 </a>
              </div>
           </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <div className="mt-12 text-center text-slate-600 text-xs">
        <p>Equipo MCM — Sistema de Suscripciones Inteligente</p>
      </div>

    </div>
  );
}
