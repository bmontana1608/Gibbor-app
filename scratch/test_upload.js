const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We initialize using NEXT_PUBLIC_SUPABASE_ANON_KEY to simulate the frontend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUpload() {
  console.log("🧪 Probando subida al bucket 'documentos' usando la ANON KEY (cliente público)...");
  
  const content = "test de subida de archivo para documentos de inscripcion";
  const buffer = Buffer.from(content, 'utf-8');
  
  // Intentamos subir un archivo ficticio en la carpeta de pruebas
  const { data, error } = await supabase.storage
    .from('documentos')
    .upload('pruebas/test_anon.txt', buffer, {
      contentType: 'text/plain',
      upsert: true
    });
    
  if (error) {
    console.log("\n❌ Falló la subida con la Anon Key.");
    console.log("Razón:", error.message);
    console.log("\n💡 Esto significa que el RLS de almacenamiento está activo y requiere políticas explícitas.");
  } else {
    console.log("\n✅ ¡Subida exitosa con Anon Key!", data);
    
    // Eliminamos el archivo de prueba para limpiar
    const { error: delError } = await supabase.storage
      .from('documentos')
      .remove(['pruebas/test_anon.txt']);
      
    if (delError) {
      console.error("⚠️ No se pudo eliminar el archivo de prueba:", delError.message);
    } else {
      console.log("✅ Limpieza completada con éxito.");
    }
  }
}

testUpload();
