const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupStoragePolicies() {
  console.log('--- Configurando políticas de Supabase Storage via RPC exec_sql ---');
  
  const query = `
    -- Asegurar RLS en storage.objects
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Eliminar políticas antiguas para evitar conflictos
    DROP POLICY IF EXISTS "Permitir insercion publica documentos" ON storage.objects;
    DROP POLICY IF EXISTS "Permitir lectura publica documentos" ON storage.objects;
    
    DROP POLICY IF EXISTS "Permitir insercion publica fotos" ON storage.objects;
    DROP POLICY IF EXISTS "Permitir lectura publica fotos" ON storage.objects;
    
    DROP POLICY IF EXISTS "Permitir insercion publica recibos" ON storage.objects;
    DROP POLICY IF EXISTS "Permitir lectura publica recibos" ON storage.objects;

    -- Políticas para 'documentos' (Inscripción pública)
    CREATE POLICY "Permitir insercion publica documentos" 
    ON storage.objects FOR INSERT 
    TO public 
    WITH CHECK (bucket_id = 'documentos');

    CREATE POLICY "Permitir lectura publica documentos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'documentos');

    -- Políticas para 'fotos' (Perfil/Logos)
    CREATE POLICY "Permitir insercion publica fotos" 
    ON storage.objects FOR INSERT 
    TO public 
    WITH CHECK (bucket_id = 'fotos');

    CREATE POLICY "Permitir lectura publica fotos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'fotos');

    -- Políticas para 'recibos' (Comprobantes de pago)
    CREATE POLICY "Permitir insercion publica recibos" 
    ON storage.objects FOR INSERT 
    TO public 
    WITH CHECK (bucket_id = 'recibos');

    CREATE POLICY "Permitir lectura publica recibos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'recibos');
  `;

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: query
  });

  if (error) {
    console.error('❌ Error al aplicar políticas SQL:', error.message);
  } else {
    console.log('✅ ¡Políticas de almacenamiento aplicadas con éxito!');
  }
}

setupStoragePolicies();
