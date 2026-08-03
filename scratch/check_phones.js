const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentMembers() {
  console.log("🔍 Consultando perfiles para verificar números de teléfono...");
  
  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, telefono')
    .limit(15);
    
  if (error) {
    console.error("❌ Error al consultar perfiles:", error.message);
    return;
  }
  
  console.log("\n--- PERFILES REGISTRADOS ---");
  perfiles.forEach(p => {
    console.log(`👤 Alumno: ${p.nombres} ${p.apellidos}`);
    console.log(`   📞 Teléfono registrado: "${p.telefono}"`);
    console.log(`   🧹 Número limpio: "${String(p.telefono || '').replace(/\D/g, '')}"`);
    console.log("-----------------------------------------");
  });
  
  console.log("\n🔍 Consultando pagos e ingresos...");
  const { data: pagos, errorPagos } = await supabase
    .from('pagos_ingresos')
    .select('id, nombres, apellidos, total, fecha')
    .order('fecha', { ascending: false })
    .limit(5);
    
  if (errorPagos) {
    console.error("❌ Error al consultar pagos:", errorPagos.message);
    return;
  }
  
  console.log("\n--- ÚLTIMOS 5 PAGOS REGISTRADOS ---");
  pagos.forEach(p => {
    console.log(`💵 Pago de: ${p.nombres} ${p.apellidos}`);
    console.log(`   💰 Total: $${p.total}`);
    console.log(`   📅 Fecha de pago: ${p.fecha}`);
    console.log("-----------------------------------------");
  });
}

checkRecentMembers();
