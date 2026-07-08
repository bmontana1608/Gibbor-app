const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function linkDirectorToAlpha() {
  const directorId = 'ea32b098-f425-4c11-a064-77f8aef12082';
  
  console.log('--- Actualizando Categoría Alpha ---');
  const { data, error } = await supabase
    .from('categorias')
    .update({ entrenador_id: directorId })
    .ilike('nombre', '%alpha%')
    .select();

  if (error) {
    console.error('Error actualizando:', error.message);
  } else {
    console.log('✅ Categoría vinculada con éxito:', data[0].nombre);
  }
}

linkDirectorToAlpha();
