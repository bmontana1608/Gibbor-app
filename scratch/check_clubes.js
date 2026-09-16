const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClubes() {
  console.log("🔍 Consultando clubes en Supabase...");
  
  const { data: clubes, error } = await supabase
    .from('clubes')
    .select('id, nombre, slug, color_primario');
    
  if (error) {
    console.error("❌ Error al consultar clubes:", error.message);
    return;
  }
  
  console.log("\n--- CLUBES CONFIGURADOS ---");
  clubes.forEach(c => {
    console.log(`🛡️ Club: "${c.nombre}"`);
    console.log(`   Slug: "${c.slug}"`);
    console.log(`   ID: "${c.id}"`);
    console.log(`   Color: "${c.color_primario}"`);
    console.log("-----------------------------------------");
  });
}

checkClubes();
