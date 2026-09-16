const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkGerardoCategories() {
  console.log('--- Buscando Perfil de Gerardo ---');
  const { data: perfiles, error: pError } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, rol, club_id')
    .ilike('nombres', '%gerardo%');

  if (pError || !perfiles || perfiles.length === 0) {
    console.error('No se encontró a Gerardo o hubo un error.');
    return;
  }

  const gerardo = perfiles[0];
  console.log(`Encontrado: ${gerardo.nombres} ${gerardo.apellidos} (ID: ${gerardo.id})`);

  console.log('\n--- Buscando Categorías Asignadas ---');
  const { data: categorias, error: cError } = await supabase
    .from('categorias')
    .select('nombre, id')
    .eq('entrenador_id', gerardo.id);

  if (cError) {
    console.error('Error al buscar categorías:', cError.message);
  } else if (categorias.length === 0) {
    console.log('⚠️ Gerardo NO tiene categorías asignadas actualmente.');
  } else {
    console.log(`Gerardo tiene ${categorias.length} categorías:`);
    categorias.forEach(c => console.log(`- ${c.nombre} (ID: ${c.id})`));
  }
}

checkGerardoCategories();
