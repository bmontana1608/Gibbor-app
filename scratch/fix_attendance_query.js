const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAttendanceQuery() {
  console.log('--- Sincronizando nombres de entrenadores en categorías ---');

  // 1. Para Alpha (Tú: Administrador Gibbor FC)
  const { error: errorAlpha } = await supabase
    .from('categorias')
    .update({ entrenadores: 'Administrador Gibbor FC' })
    .eq('nombre', 'CATEGORÍA ALPHA (5 a 8 años)');

  // 2. Para Elite y Vértice (Gerardo Cruz)
  const { error: errorElite } = await supabase
    .from('categorias')
    .update({ entrenadores: 'Gerardo Cruz' })
    .ilike('nombre', '%ÉLITE%');

  const { error: errorVertice } = await supabase
    .from('categorias')
    .update({ entrenadores: 'Gerardo Cruz' })
    .ilike('nombre', '%VÉRTICE%');

  if (errorAlpha) console.error('Error Alpha:', errorAlpha.message);
  if (errorElite) console.error('Error Elite:', errorElite.message);
  if (errorVertice) console.error('Error Vertice:', errorVertice.message);

  console.log('✅ Nombres de entrenadores actualizados en la tabla de categorías.');
}

fixAttendanceQuery();
