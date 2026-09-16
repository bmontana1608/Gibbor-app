const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function reconstruccionTotal() {
  console.log("💣 Iniciando reconstrucción total de pagos...");

  // 1. Obtenemos a los 22 futbolistas con su ID ACTUAL
  const { data: jugadores } = await supabase.from('perfiles')
    .select('id, nombres, estado_pago')
    .eq('rol', 'Futbolista');

  if (!jugadores) return;

  // 2. Borramos cualquier pago que diga "Auto-Sync" o que sea huérfano de este mes
  // Para evitar errores de FK, simplemente vamos a añadir los pagos correctos.
  
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  
  let vinculados = 0;

  for (const j of jugadores) {
    if (j.estado_pago === 'Al día') {
      // Insertamos un pago fresco con el ID NUEVO
      const { error } = await supabase.from('pagos_ingresos').upsert({
        jugador_id: j.id,
        monto: 150000,
        total: 150000,
        concepto: "Mensualidad Abril 2026 (Validado)",
        fecha: fechaHoy,
        verificado: true,
        metodo_pago: 'Efectivo'
      }, { onConflict: 'jugador_id, fecha' }); // Si ya existe para ese día, lo actualiza

      if (!error) vinculados++;
      else console.error(`Error con ${j.nombres}:`, error.message);
    }
  }

  console.log(`✅ ¡Proceso terminado! ${vinculados} jugadores ahora están oficialmente 'Al día' en el Dashboard.`);
}

reconstruccionTotal();
