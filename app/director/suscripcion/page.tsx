'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';
import { Star, Calendar, CheckCircle2, AlertTriangle, Users, Wallet, CreditCard, Loader2 } from 'lucide-react';

export default function SuscripcionPage() {
  const { route, slug: tenantSlug } = useTenant();
  const searchParams = useSearchParams();
  const mpStatus = searchParams.get('mp_status');

  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jugadoresActivos, setJugadoresActivos] = useState(0);
  const [paying, setPaying] = useState(false);

  const fetchSuscripcion = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/tenant?slug=${tenantSlug}`, { cache: 'no-store' });
      if (!res.ok) return;
      const clubData = await res.json();
      setClub(clubData);

      // Calcular jugadores activos (sin directores ni entrenadores)
      const { count } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubData.id)
        .eq('estado_miembro', 'Activo')
        .not('rol', 'in', '("Director","Entrenador")');

      setJugadoresActivos(count || 0);

    } catch (e) {
      console.error(e);
      toast.error('Error cargando información de suscripción');
    }
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => {
    fetchSuscripcion();
  }, [fetchSuscripcion]);

  useEffect(() => {
    if (mpStatus === 'success') toast.success('¡Pago procesado exitosamente! Tu suscripción ha sido renovada.');
    if (mpStatus === 'failure') toast.error('El pago ha fallado o fue rechazado. Intenta con otro método.');
    if (mpStatus === 'pending') toast.info('El pago está pendiente de acreditación.');
  }, [mpStatus]);

  const handlePago = async () => {
    if (!club) return;
    setPaying(true);
    const toastId = toast.loading('Generando enlace de pago...');

    try {
      const res = await fetch('/api/suscripcion/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: club.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar pago');

      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message, { id: toastId });
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!club) {
    return <div className="p-6 text-slate-500">No se pudo cargar la información.</div>;
  }

  const tarifa = club.tarifa_por_jugador || 0;
  const total = tarifa * jugadoresActivos;
  const proximoCorte = club.proximo_corte ? new Date(club.proximo_corte) : null;
  const estado = club.estado_suscripcion || 'Desconocido';

  const estadoConfig: Record<string, { color: string, icon: any, label: string }> = {
    'Activa': { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Suscripción Activa' },
    'En Prueba': { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Star, label: 'Período de Prueba' },
    'Vencida': { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle, label: 'Suscripción Vencida' },
  };

  const currentEstado = estadoConfig[estado] || { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Star, label: estado };
  const EstadoIcon = currentEstado.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Star className="text-amber-500 w-8 h-8" />
            Mi Suscripción
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Gestiona el plan de tu academia, revisa tus fechas de corte y realiza tus pagos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta Principal de Estado */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Star className="w-40 h-40" />
            </div>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-black uppercase tracking-wider mb-8 ${currentEstado.color}`}>
              <EstadoIcon className="w-4 h-4" />
              {currentEstado.label}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Próximo Corte
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  {proximoCorte ? proximoCorte.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'No definido'}
                </p>
                {estado === 'En Prueba' && (
                  <p className="text-sm text-amber-600 mt-1 font-bold">Activa tu cuenta antes de esta fecha para no perder el acceso.</p>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Plan Actual
                </p>
                <p className="text-2xl font-black text-brand">
                  {club.plan || 'Plan Base'}
                </p>
                <p className="text-sm text-slate-500 mt-1 font-medium">Tarifa: ${tarifa.toLocaleString('es-CO')} COP / Jugador</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen de Pago */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl shadow-slate-900/50 text-white flex flex-col">
            <h3 className="font-black text-xl mb-6">Resumen del Mes</h3>
            
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span>Jugadores Activos</span>
                </div>
                <span className="font-black text-xl">{jugadoresActivos}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4">
                <span className="text-slate-300">Tarifa Unitaria</span>
                <span className="font-bold">${tarifa.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">Total a Pagar</p>
              <p className="text-4xl font-black text-emerald-400 mb-6">
                ${total.toLocaleString('es-CO')} <span className="text-lg font-bold text-slate-500">COP</span>
              </p>

              <button
                onClick={handlePago}
                disabled={paying || total === 0}
                className="w-full bg-brand hover:bg-brand-hover disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-brand/20 active:scale-95 flex items-center justify-center gap-3"
              >
                {paying ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    Pagar Suscripción
                  </>
                )}
              </button>
              {total === 0 && (
                <p className="text-xs text-center text-slate-400 mt-3">No tienes jugadores activos para facturar.</p>
              )}
            </div>
          </div>
        </div>

        {/* Políticas o Información Adicional */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <h4 className="font-black text-slate-800 dark:text-white mb-4">¿Cómo funciona la facturación?</h4>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-2">
              <span className="text-brand font-bold">•</span>
              Solo pagas por los <strong>jugadores activos</strong>. Si un jugador se da de baja, no entra en el corte del mes.
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold">•</span>
              Los perfiles de Directores y Entrenadores son <strong>totalmente gratis</strong> y no se suman al cálculo.
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold">•</span>
              Al realizar tu pago, tu fecha de corte se aplazará un mes completo automáticamente.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
