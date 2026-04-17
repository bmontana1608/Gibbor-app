const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function vincularFamilias() {
  console.log("🔗 Iniciando vinculación de familias y hermanos...");

  // 1. Obtenemos todos los usuarios de Auth para tener sus IDs reales
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const authMap = new Map();
  users.forEach(u => authMap.set(u.email.toLowerCase().trim(), u.id));

  // 2. Obtenemos todos los perfiles
  const { data: perfiles } = await supabase.from('perfiles').select('id, nombres, email_contacto');

  let vinculados = 0;

  for (const perfil of perfiles) {
    if (!perfil.email_contacto) continue;

    // Normalizamos el correo (limpiamos el punto al final si lo tiene)
    let emailLimpio = perfil.email_contacto.toLowerCase().trim();
    if (emailLimpio.endsWith('.')) {
      emailLimpio = emailLimpio.slice(0, -1);
      // Actualizamos el correo en el perfil para que queden iguales
      await supabase.from('perfiles').update({ email_contacto: emailLimpio }).eq('id', perfil.id);
    }

    const authId = authMap.get(emailLimpio);

    if (authId) {
      // Si el perfil ya tiene el ID de Auth como su ID principal, no hacemos nada en id_acudiente
      if (perfil.id === authId) {
        console.log(`✅ ${perfil.nombres} es el perfil principal.`);
      } else {
        // Si el perfil tiene un ID diferente pero el mismo correo, lo vinculamos como "hijo/hermano"
        console.log(`🔗 Vinculando a ${perfil.nombres} como hermano/hijo de la cuenta ${emailLimpio}`);
        await supabase.from('perfiles').update({ id_acudiente: authId }).eq('id', perfil.id);
        vinculados++;
      }
    }
  }

  console.log(`\n🎉 Vinculación terminada. ${vinculados} hermanos ahora son accesibles desde la cuenta de su papá/mamá.`);
}

vincularFamilias();
