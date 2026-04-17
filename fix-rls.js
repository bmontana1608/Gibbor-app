const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLS() {
  console.log("🛡️ Ajustando políticas de seguridad familiar...");

  const sql = `
    -- Eliminamos la política anterior si existe
    DROP POLICY IF EXISTS "Usuarios pueden ver sus propios datos" ON perfiles;
    DROP POLICY IF EXISTS "Acceso Familiar Gibbor" ON perfiles;

    -- Creamos la nueva política que permite ver el propio perfil O los perfiles de los hijos/hermanos
    CREATE POLICY "Acceso Familiar Gibbor" 
    ON perfiles 
    FOR SELECT 
    USING (
      auth.uid() = id 
      OR 
      auth.uid() = id_acudiente
      OR
      rol = 'Director' -- El director puede ver todo
    );
  `;

  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });

  if (error) {
    console.error("❌ Error aplicando política:", error.message);
  } else {
    console.log("✅ ¡Acceso familiar desbloqueado con éxito!");
  }
}

fixRLS();
