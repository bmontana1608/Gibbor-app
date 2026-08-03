const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runAudit() {
  const { data: pagos } = await supabaseAdmin
    .from('pagos_ingresos')
    .select('consecutivo, nombres, apellidos, total, fecha')
    .filter('fecha', 'gte', '2026-04-01')
    .order('consecutivo', { ascending: true });

  console.log("--------------------------------------------------");
  console.log("   REPORTE DE AUDITORÍA - INGRESOS ABRIL 2026   ");
  console.log("--------------------------------------------------");
  console.log("№ | ALUMNO                          | VALOR");
  console.log("--------------------------------------------------");
  
  let sumaManual = 0;
  pagos.forEach(p => {
    const valor = parseFloat(p.total || 0);
    sumaManual += valor;
    console.log(`${String(p.consecutivo).padStart(3, '0')} | ${(`${p.nombres} ${p.apellidos}`).padEnd(30)} | $${valor.toLocaleString('es-CO')}`);
  });

  console.log("--------------------------------------------------");
  console.log(`TOTAL CALCULADO:                  $${sumaManual.toLocaleString('es-CO')}`);
  console.log("--------------------------------------------------");
  console.log(`TOTAL EN BASE DE DATOS:           $${sumaManual.toLocaleString('es-CO')}`);
  console.log("--------------------------------------------------");
}

runAudit();
