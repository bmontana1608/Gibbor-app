const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceOpenCategories() {
  console.log('--- Forzando apertura de permisos en "categorias" ---');
  
  // Ejecutamos SQL para permitir lectura a usuarios autenticados
  // Nota: Usamos rpc si está disponible o simplemente confiamos en que al ser Service Role podemos gestionar el acceso.
  // Pero lo más efectivo aquí es crear una política que permita a CUALQUIERA logueado ver las categorías.
  
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: `
      -- 1. Asegurarnos que RLS está activo pero con una política permisiva para lectura
      ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON categorias;
      
      CREATE POLICY "Permitir lectura a usuarios autenticados" 
      ON categorias FOR SELECT 
      TO authenticated 
      USING (true);
    `
  });

  if (error) {
    console.error('Error al aplicar SQL:', error.message);
    console.log('Intentando método alternativo...');
    
    // Si no hay RPC exec_sql, el problema es que no puedo cambiar políticas desde JS.
    // Sin embargo, puedo intentar verificar si el problema es el 'club_id' en la consulta.
  } else {
    console.log('✅ Política de lectura pública (para logueados) aplicada con éxito.');
  }
}

forceOpenCategories();
