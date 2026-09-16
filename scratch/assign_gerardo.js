const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixGerardoCategories() {
  const gerardoId = 'c9ed1e39-9afe-4bd6-bf9f-7066fd54caeb';
  const categoriesToFix = [
    '3037e751-e4ac-4157-85d3-7b28788145c0', // ELITE
    '3827a078-d83a-4602-936a-1729b889ffa3'  // VERTICE
  ];
  
  console.log('--- Vinculando Categorías a Gerardo ---');
  
  const { data, error } = await supabase
    .from('categorias')
    .update({ entrenador_id: gerardoId })
    .in('id', categoriesToFix)
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('✅ Categorías vinculadas con éxito:');
    data.forEach(c => console.log(`- ${c.nombre}`));
  }
}

fixGerardoCategories();
