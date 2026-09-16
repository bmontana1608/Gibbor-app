const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function healPayments() {
  console.log("Iniciando rescate de pagos de Abril...");

  // 1. Obtener todos los pagos de Abril 2026
  const { data: pagos, error: errPagos } = await supabaseAdmin
    .from('pagos_ingresos')
    .select('*')
    .filter('fecha', 'gte', '2026-04-01');

  if (errPagos) return console.error("Error cargando pagos:", errPagos.message);
  console.log(`Encontrados ${pagos.length} pagos en Abril.`);

  // 2. Obtener todos los perfiles de Futbolistas
  const { data: jugadores, error: errJug } = await supabaseAdmin
    .from('perfiles')
    .select('id, nombres, apellidos')
    .eq('rol', 'Futbolista');

  if (errJug) return console.error("Error cargando jugadores:", errJug.message);

  let reparados = 0;
  let marcadosAlDia = 0;

  for (const pago of pagos) {
    // Buscar al jugador por nombre (insensible a mayúsculas)
    const nombrePago = `${pago.nombres} ${pago.apellidos}`.toLowerCase().trim();
    
    const jugadorReclamo = jugadores.find(j => 
       `${j.nombres} ${j.apellidos}`.toLowerCase().trim() === nombrePago
    );

    if (jugadorReclamo) {
      // Si el ID no coincide, lo reparamos
      if (pago.jugador_id !== jugadorReclamo.id) {
        console.log(`Viculando pago #${pago.consecutivo} a ${nombrePago}...`);
        await supabaseAdmin
          .from('pagos_ingresos')
          .update({ jugador_id: jugadorReclamo.id })
          .eq('id', pago.id);
        reparados++;
      }

      // Marcar perfil como Al día (en el campo de la tabla)
      await supabaseAdmin
        .from('perfiles')
        .update({ estado_pago: 'Al día' })
        .eq('id', jugadorReclamo.id);
      marcadosAlDia++;
    } else {
      console.warn(`No se pudo encontrar un perfil para: ${nombrePago}`);
    }
  }

  console.log("\n--- RESULTADOS DEL RESCATE ---");
  console.log(`Recibos re-vinculados: ${reparados}`);
  console.log(`Jugadores marcados 'Al día': ${marcadosAlDia}`);
  console.log("------------------------------");
}

healPayments();
