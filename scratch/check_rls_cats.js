const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSPolicies() {
  console.log('--- Analizando políticas de la tabla "categorias" ---');
  
  // No podemos listar políticas directamente por API de JS fácilmente, 
  // pero podemos intentar leer la tabla como un usuario normal VS como admin (service role)
  
  const { data: asAdmin } = await supabase
    .from('categorias')
    .select('*');

  console.log(`Como Admin (Service Role) veo: ${asAdmin?.length || 0} categorías.`);
  if (asAdmin) {
    asAdmin.forEach(c => console.log(`- ${c.nombre} | Entrenador ID: ${c.entrenador_id} | Entrenadores (texto): ${c.entrenadores}`));
  }

  console.log('\n--- Verificando estructura de la tabla ---');
  // Intentar ver si hay algo más que bloquee
}

checkRLSPolicies();
