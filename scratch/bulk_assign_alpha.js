const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function bulkAssignAlpha() {
  const gibborClubId = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  const alphaCategoryId = '62df25c7-3e33-4719-889f-8a501905aedd';
  
  console.log('--- Buscando alumnos de Gibbor sin categoría ---');
  
  // 1. Buscamos alumnos que pertenezcan al club
  const { data: alumnos, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, grupos')
    .eq('club_id', gibborClubId)
    .eq('rol', 'Futbolista');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Encontrados ${alumnos.length} alumnos en total.`);

  // Filtramos los que no tienen grupo o tienen el string vacío/Ninguna
  const alumnosParaAsignar = alumnos.filter(a => !a.grupos || a.grupos === 'Ninguna' || a.grupos === '');
  
  if (alumnosParaAsignar.length === 0) {
    console.log('No hay alumnos pendientes por asignar.');
    return;
  }

  const ids = alumnosParaAsignar.map(a => a.id);
  console.log(`Asignando ${ids.length} alumnos a la categoría ALPHA...`);

  // 2. Actualizamos el campo 'grupos' en la tabla perfiles
  const { error: updateError } = await supabase
    .from('perfiles')
    .update({ grupos: 'ALPHA' })
    .in('id', ids);

  if (updateError) {
    console.error('Error al actualizar perfiles:', updateError.message);
  } else {
    console.log('✅ Perfiles actualizados correctamente.');
  }
}

bulkAssignAlpha();
