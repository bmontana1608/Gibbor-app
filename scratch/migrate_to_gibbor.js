const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GIBBOR_ID = '8ccc1313-d7f3-42c1-8b91-b97014705694';

async function migrateOrphans() {
  console.log("Iniciando migración masiva a Gibbor FC...");

  const tables = [
    'perfiles',
    'pagos_ingresos',
    'pagos_egresos',
    'categorias',
    'asistencias',
    'eventos',
    'evaluaciones_tecnicas',
    'mensajes_wa',
    'planes'
  ];

  for (const table of tables) {
    console.log(`Migrando tabla: ${table}...`);
    try {
      const { data, count, error } = await supabaseAdmin
        .from(table)
        .update({ club_id: GIBBOR_ID })
        .is('club_id', null)
        .select('id', { count: 'exact' });

      if (error) {
        console.error(`  Error en ${table}:`, error.message);
      } else {
        console.log(`  Éxito: ${data?.length || 0} registros actualizados.`);
      }
    } catch (err) {
      console.error(`  Fallo crítico en ${table}:`, err.message);
    }
  }

  console.log("\nMigración completada. Ahora todos los datos pertenecen a Gibbor.");
}

migrateOrphans();
