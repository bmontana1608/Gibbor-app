const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listPending() {
  const { data: jugadores } = await supabaseAdmin.from('perfiles').select('id, nombres, apellidos, tipo_plan').eq('rol', 'Futbolista');
  const { data: pagos } = await supabaseAdmin.from('pagos_ingresos').select('jugador_id').filter('fecha', 'gte', '2026-04-01');
  
  const idsPagados = new Set(pagos.map(p => p.jugador_id));
  
  console.log("JUGADORES PENDIENTES DE PAGO (ABRIL):");
  let totalPendiente = 0;
  
  for (const j of jugadores) {
    if (!idsPagados.has(j.id)) {
      console.log(`- ${j.nombres} ${j.apellidos} (${j.tipo_plan || 'Regular'})`);
    }
  }
}

listPending();
