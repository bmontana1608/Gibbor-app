const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const envKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : null;
const supabaseServiceKey = envKeyMatch ? envKeyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan las variables de entorno en .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBuckets() {
  const buckets = ['documentos', 'fotos', 'recibos'];
  
  console.log("🔍 Obteniendo lista de buckets en Supabase...");
  const { data: list, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("❌ Error al listar buckets:", listError.message);
    return;
  }
  
  const existingNames = list.map(b => b.id);
  console.log("Buckets existentes:", existingNames);

  for (const b of buckets) {
    const exists = existingNames.includes(b);
    if (!exists) {
      console.log(`🛠️ Creando bucket '${b}'...`);
      const { data, error } = await supabase.storage.createBucket(b, {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
      if (error) {
        console.error(`❌ Error al crear bucket '${b}':`, error.message);
      } else {
        console.log(`✅ Bucket '${b}' creado con éxito.`);
      }
    } else {
      console.log(`🔄 El bucket '${b}' ya existe. Asegurando configuración pública de 10MB...`);
      const { data, error } = await supabase.storage.updateBucket(b, {
        public: true,
        fileSizeLimit: 10485760
      });
      if (error) {
        console.error(`❌ Error al actualizar bucket '${b}':`, error.message);
      } else {
        console.log(`✅ Bucket '${b}' actualizado con éxito.`);
      }
    }
  }
  console.log("🎉 Proceso de configuración de buckets finalizado.");
}

setupBuckets();
