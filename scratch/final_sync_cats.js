const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalSync() {
  console.log('--- Sincronizando nombres exactos de categorías ---');
  
  // 1. Tu perfil (Director - Categoría Alpha)
  const directorId = 'ea32b098-f425-4c11-a064-77f8aef12082';
  const nombreAlpha = 'CATEGORÍA ALPHA (5 a 8 años)';
  
  await supabase
    .from('perfiles')
    .update({ grupos: nombreAlpha })
    .eq('id', directorId);
    
  // 2. Perfil de Gerardo (Elite y Vértice)
  const gerardoId = 'c9ed1e39-9afe-4bd6-bf9f-7066fd54caeb';
  const nombresGerardo = 'CATEGORÍA ÉLITE (12 a 15 años), CATEGORÍA VÉRTICE (9 a 11 años)';
  
  await supabase
    .from('perfiles')
    .update({ grupos: nombresGerardo })
    .eq('id', gerardoId);

  console.log('✅ Nombres sincronizados. Ahora los menús de asistencia deberían aparecer correctamente.');
}

finalSync();
