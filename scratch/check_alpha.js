const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAlphaCategory() {
  const directorId = 'ea32b098-f425-4c11-a064-77f8aef12082'; // ID del usuario del Director
  
  console.log('--- Buscando Categoría Alpha ---');
  const { data: categoria, error } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nombre', '%alpha%')
    .single();

  if (error) {
    console.error('Error:', error.message);
    
    console.log('\n--- Listando todas las categorías del club ---');
    const { data: todas } = await supabase.from('categorias').select('*');
    todas?.forEach(c => console.log(`- ${c.nombre} (ID: ${c.id}) | Entrenador ID: ${c.entrenador_id}`));
  } else {
    console.log('Categoría encontrada:');
    console.log('- Nombre:', categoria.nombre);
    console.log('- Entrenador ID actual:', categoria.entrenador_id);
    
    if (categoria.entrenador_id === directorId) {
      console.log('✅ El ID ya coincide en la tabla.');
    } else {
      console.log('❌ El ID NO coincide. El Director tiene ID:', directorId);
    }
  }
}

checkAlphaCategory();
