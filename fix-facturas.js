const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data: facturas } = await supabase.from('facturacion_mensual').select('*, clubes(planes_saas(*))').eq('periodo_mes', 7).eq('periodo_anio', 2026);
  
  for (const fac of facturas) {
    const plan = fac.clubes.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    
    const extras = Math.max(0, fac.cantidad_jugadores - limiteBase);
    const correctTotal = precioBase + (extras * precioExtra);
    
    console.log(`Fixing ${fac.id}: current total_pagar=${fac.total_pagar}, correctTotal=${correctTotal}`);
    
    if (fac.total_pagar !== correctTotal) {
      await supabase.from('facturacion_mensual').update({ total_pagar: correctTotal, tarifa_aplicada: precioBase }).eq('id', fac.id);
      console.log(`Updated ${fac.id}`);
    }
  }
}
fix();
