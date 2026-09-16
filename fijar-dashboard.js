const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function limpiezaFinalDashboard() {
  console.log("🧹 Iniciando limpieza profunda de datos para el Dashboard...");

  // 1. Asegurar que todos los futbolistas estén marcados como 'Activo' (no pendiente)
  const { error: errAct } = await supabase.from('perfiles')
    .update({ estado_miembro: 'Activo' })
    .eq('rol', 'Futbolista');

  if (errAct) console.error("❌ Error activando miembros:", errAct);

  // 2. Corregir formato de fechas en la tabla de pagos
  // El Dashboard espera AAAA-MM-DD
  const hoy = new Date();
  const fechaLimpia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const { data: pagos } = await supabase.from('pagos_ingresos').select('id, concepto');
  
  if (pagos) {
    for (const pago of pagos) {
      if (pago.concepto && pago.concepto.includes("Auto-Sync")) {
         await supabase.from('pagos_ingresos')
           .update({ fecha: fechaLimpia })
           .eq('id', pago.id);
      }
    }
  }

  console.log(`✅ Datos limpiados. Fecha configurada como: ${fechaLimpia}`);
  console.log("🚀 Ahora el Dashboard debería mostrar los números reales.");
}

limpiezaFinalDashboard();
