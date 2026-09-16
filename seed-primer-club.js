const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargamos variables de entorno locales
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function registrarPrimerClub() {
  console.log("🏟️ Registrando club base (Gibbor FC)...");

  const { data, error } = await supabase
    .from('clubes')
    .upsert({
      nombre: 'EFD Gibbor',
      slug: 'gibbor', // Esto habilitará gibbor.lvh.me
      logo_url: 'https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png',
      color_primario: '#ea580c',
      color_secundario: '#1e293b',
      plan: 'Enterprise',
      estado: 'Activo'
    }, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error("❌ Error al registrar:", error.message);
  } else {
    console.log("✅ Club registrado con éxito:", data[0].nombre);
    console.log("🚀 El slug 'gibbor' ya es funcional.");
  }
}

registrarPrimerClub();
