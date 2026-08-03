const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function generarAccesosMasivos() {
  console.log("🚀 Iniciando generación de accesos masivos...");
  const PASSWORD_MAESTRA = "Gibbor2026*";

  // 1. Obtener todos los perfiles con correo
  const { data: perfiles, error: errP } = await supabase
    .from('perfiles')
    .select('*')
    .not('email_contacto', 'is', null)
    .neq('email_contacto', '');

  if (errP) {
    console.error("❌ Error al obtener perfiles:", errP);
    return;
  }

  console.log(`📋 Se encontraron ${perfiles.length} perfiles con correo electrónico.`);

  let creados = 0;
  let errores = 0;
  let saltados = 0;

  for (const perfil of perfiles) {
    try {
      const emailLower = perfil.email_contacto.toLowerCase().trim();
      
      // Verificamos si ya existe en Auth
      const { data: { users }, error: errList } = await supabase.auth.admin.listUsers();
      const yaExiste = users.find(u => u.email === emailLower);

      if (yaExiste) {
        console.log(`⏩ [SALTADO] ${perfil.nombres} (${emailLower}) ya tiene acceso.`);
        saltados++;
        continue;
      }

      // 2. Crear usuario en Auth
      const { data: newUser, error: errAuth } = await supabase.auth.admin.createUser({
        email: emailLower,
        password: PASSWORD_MAESTRA,
        email_confirm: true,
        user_metadata: { role: perfil.rol || 'Futbolista' }
      });

      if (errAuth) {
        console.error(`❌ [ERROR] Falló creación para ${perfil.nombres}:`, errAuth.message);
        errores++;
        continue;
      }

      const newId = newUser.user.id;

      // 3. ACTUALIZACIÓN CRÍTICA: Sincronizar el ID del perfil con el de Auth
      // Dado que el ID es PK, creamos uno nuevo con el ID correcto y borramos el viejo, o insertamos/actualizamos datos
      // Lo más seguro es insertar los datos en el ID de Auth y luego borrar el registro huérfano si es necesario
      
      const { error: errUpsert } = await supabase.from('perfiles').upsert({
        ...perfil,
        id: newId,
        email_contacto: emailLower
      });

      if (errUpsert) {
        console.error(`❌ [ERROR] Falló vinculación de perfil para ${perfil.nombres}:`, errUpsert.message);
        errores++;
      } else {
        // Si el ID viejo era diferente al nuevo, borramos el registro con el ID anterior
        if (perfil.id !== newId) {
          await supabase.from('perfiles').delete().eq('id', perfil.id);
        }
        console.log(`✅ [EXITO] Acceso creado para ${perfil.nombres} - User: ${emailLower}`);
        creados++;
      }

    } catch (e) {
      console.error(`⚠️ Excepción con ${perfil.nombres}:`, e);
      errores++;
    }
  }

  console.log("\n--- RESULTADO FINAL ---");
  console.log(`✅ Creados: ${creados}`);
  console.log(`⏩ Saltados: ${saltados}`);
  console.log(`❌ Errores: ${errores}`);
  console.log("-----------------------");
}

generarAccesosMasivos();
