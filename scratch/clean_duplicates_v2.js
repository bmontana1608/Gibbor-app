const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAndFixDuplicates() {
  const CLUB_ID = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  console.log("Analizando duplicados para el club (Gibbor) usando documento_identidad...");

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
    if (!p.documento_identidad) return;
    const doc = p.documento_identidad.trim();
    if (!groups[doc]) groups[doc] = [];
    groups[doc].push(p);
  });

  const duplicates = Object.entries(groups).filter(([doc, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("No se encontraron duplicados con documento_identidad. Intentando por Nombres...");
    
    // Fallback: Duplicados por Nombres + Apellidos
    const nameGroups = {};
    perfiles.forEach(p => {
      const key = `${p.nombres.trim().toLowerCase()} ${p.apellidos.trim().toLowerCase()}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(p);
    });
    
    const nameDuplicates = Object.entries(nameGroups).filter(([name, list]) => list.length > 1);
    
    if (nameDuplicates.length === 0) {
      console.log("Tampoco se encontraron duplicados por nombre.");
      return;
    }
    
    processGroups(nameDuplicates);
  } else {
    processGroups(duplicates);
  }

  async function processGroups(duplicateGroups) {
    console.log(`Encontrados ${duplicateGroups.length} grupos de duplicados.`);

    for (const [key, list] of duplicateGroups) {
      console.log(`\nProcesando: ${key}`);
      
      // 1. Decidir cuál es el "Master"
      const scoredList = list.map(p => {
        let score = 0;
        if (p.documento_identidad && p.documento_identidad !== '000000') score += 10;
        if (p.email_contacto && !p.email_contacto.includes('no-email')) score += 5;
        if (p.telefono) score += 5;
        if (p.grupos) score += 20;
        if (p.foto_url) score += 5;
        if (p.eps) score += 2;
        return { ...p, score };
      });

      scoredList.sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at));

      const master = scoredList[0];
      const victims = scoredList.slice(1);

      console.log(`  > MANTENER (MASTER): ${master.id} | ${master.nombres} ${master.apellidos} | Score: ${master.score}`);
      
      for (const victim of victims) {
        console.log(`  > MIGRAR Y ELIMINAR: ${victim.id} | ${victim.nombres} ${victim.apellidos} | Score: ${victim.score}`);

        // 2. Migrar Tablas dependientes
        const tables = ['asistencias', 'pagos_ingresos', 'evaluaciones_tecnicas', 'mensajes_wa'];
        for (const table of tables) {
          const { error: updErr } = await supabaseAdmin
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
}

findAndFixDuplicates();
