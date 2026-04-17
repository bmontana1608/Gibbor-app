const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const envKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : null;
const supabaseServiceKey = envKeyMatch ? envKeyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log("🛠️ Ampliando capacidad de almacenamiento a 10MB...");

  const { data: bucket, error: bucketError } = await supabase
    .storage
    .updateBucket('recibos', {
      public: true,
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
      fileSizeLimit: 10485760 // 10MB
    });

  if (bucketError) {
    console.error("❌ Error al actualizar:", bucketError.message);
  } else {
    console.log("✅ Capacidad ampliada a 10MB con éxito.");
    console.log("✅ Formatos permitidos: PDF e Imágenes (PNG/JPG).");
  }
}

setupStorage();
