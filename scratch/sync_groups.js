const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncProfileGroups() {
  console.log('--- Sincronizando campo "grupos" en perfiles ---');
  
  // 1. Para ti (Director/Entrenador Alpha)
  const directorId = 'ea32b098-f425-4c11-a064-77f8aef12082';
  await supabase
    .from('perfiles')
    .update({ grupos: 'ALPHA' })
    .eq('id', directorId);
    
  // 2. Para Gerardo (Elite y Vértice)
  const gerardoId = 'c9ed1e39-9afe-4bd6-bf9f-7066fd54caeb';
  await supabase
    .from('perfiles')
    .update({ grupos: 'ELITE, VERTICE' })
    .eq('id', gerardoId);

  console.log('✅ Perfiles actualizados con los nombres de las categorías.');
}

syncProfileGroups();
