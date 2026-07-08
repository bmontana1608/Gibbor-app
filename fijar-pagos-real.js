const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function reconstruccionRelampago() {
  console.log("⚡ Iniciando reconstrucción relámpago de pagos...");

  // 1. Obtenemos a los futbolistas reales
  const { data: jugadores } = await supabase.from('perfiles')
    .select('id, nombres, apellidos, grupos, estado_pago')
    .eq('rol', 'Futbolista');

  if (!jugadores) return;

  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  
  let vinculados = 0;

  for (const j of jugadores) {
    if (j.estado_pago === 'Al día') {
      // Insertamos el pago con los campos REALES de tu tabla
      const { error } = await supabase.from('pagos_ingresos').insert({
        jugador_id: j.id,
        nombres: j.nombres,
        apellidos: j.apellidos,
        grupo: j.grupos || 'Sin Grupo',
        monto_base: 150000,
        total: 150000,
        metodo_pago: 'Efectivo',
        notas: 'Sincronización Automática Dashboard',
        fecha: fechaHoy
      });

      if (!error) vinculados++;
      else console.error(`Error con ${j.nombres}:`, error.message);
    }
  }

  console.log(`✅ ¡AHORA SÍ! ${vinculados} jugadores sincronizados. El Dashboard debe mostrar el número real.`);
}

reconstruccionRelampago();
