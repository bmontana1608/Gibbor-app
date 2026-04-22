const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAndFixDuplicates() {
  const CLUB_ID = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  console.log("Analizando duplicados para el club...");

  const { data: perfiles, error } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .eq('club_id', CLUB_ID)
    .eq('rol', 'Futbolista');

  if (error) {
    console.error("Error:", error);
    return;
  }

  const groups = {};
  perfiles.forEach(p => {
    if (!p.documento) return;
    const doc = p.documento.trim();
    if (!groups[doc]) groups[doc] = [];
    groups[doc].push(p);
  });

  const duplicates = Object.entries(groups).filter(([doc, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("No se encontraron duplicados.");
    return;
  }

  console.log(`Encontrados ${duplicates.length} grupos de duplicados.`);

  for (const [doc, list] of duplicates) {
    console.log(`\nProcesando Documento: ${doc}`);
    
    // 1. Decidir cuál es el "Master"
    // Criterio: El que tenga más campos llenos.
    const scoredList = list.map(p => {
      let score = 0;
      if (p.email_contacto) score += 1;
      if (p.telefono) score += 1;
      if (p.rh) score += 1;
      if (p.eps) score += 1;
      if (p.fecha_nacimiento) score += 1;
      if (p.grupos) score += 10; // Priorizar si ya tiene grupo asignado
      return { ...p, score };
    });

    scoredList.sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at));

    const master = scoredList[0];
    const toDelete = scoredList.slice(1);

    console.log(`  > MANTENER (MASTER): ${master.id} | ${master.nombres} | Score: ${master.score}`);
    
    for (const victim of toDelete) {
      console.log(`  > MIGRAR Y ELIMINAR: ${victim.id} | ${victim.nombres} | Score: ${victim.score}`);

      // 2. Migrar Tablas dependientes
      const tables = ['asistencias', 'pagos_ingresos', 'evaluaciones_tecnicas', 'mensajes_wa'];
      for (const table of tables) {
        const { error: updErr, count } = await supabaseAdmin
          .from(table)
          .update({ jugador_id: master.id })
          .eq('jugador_id', victim.id);
        
        if (updErr) {
          console.error(`    Error actualizando ${table}:`, updErr.message);
        } else {
          console.log(`    Actualizada tabla ${table}.`);
        }
      }

      // 3. Eliminar el duplicado
      const { error: delErr } = await supabaseAdmin
        .from('perfiles')
        .delete()
        .eq('id', victim.id);

      if (delErr) {
          console.error(`    Error eliminando perfil ${victim.id}:`, delErr.message);
      } else {
        console.log(`    Perfil duplicado eliminado.`);
      }
    }
  }

  console.log("\nLimpieza completada.");
}

findAndFixDuplicates();
