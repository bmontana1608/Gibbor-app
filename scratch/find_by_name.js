const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findByNames() {
  const CLUB_ID = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  console.log("Buscando por Nombres y Apellidos en Gibbor...");

  const { data: perfiles } = await supabaseAdmin
    .from('perfiles')
    .select('id, nombres, apellidos, documento, groups:grupos')
    .eq('club_id', CLUB_ID)
    .eq('rol', 'Futbolista');

  const groups = {};
  perfiles.forEach(p => {
    const key = `${p.nombres.trim().toLowerCase()} ${p.apellidos.trim().toLowerCase()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const duplicates = Object.entries(groups).filter(([name, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("No se encontraron duplicados por nombre.");
    return;
  }

  console.log(`Encontrados ${duplicates.length} grupos por nombre.`);
  
  for (const [name, list] of duplicates) {
    console.log(`\nGrupo: ${name}`);
    list.forEach(p => {
      console.log(`  - ID: ${p.id} | Doc: ${p.documento} | Grupo: ${p.groups}`);
    });
  }
}

findByNames();
