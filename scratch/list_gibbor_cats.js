const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllGibborCategories() {
  const gibborClubId = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  
  console.log('--- Categorías de Gibbor ---');
  const { data: categorias, error } = await supabase
    .from('categorias')
    .select('id, nombre, entrenador_id')
    .eq('club_id', gibborClubId);

  if (error) {
    console.error('Error:', error.message);
  } else {
    categorias.forEach(c => {
      console.log(`- ${c.nombre} | ID: ${c.id} | Entrenador ID: ${c.entrenador_id}`);
    });
  }
}

listAllGibborCategories();
