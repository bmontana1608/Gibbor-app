const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repair() {
  const activeClubId = "3cebcc50-2700-4915-88f0-f5aee6ea1efa";
  const directorProfileId = "08111d81-d773-4b19-bec5-5032b6199c3a";
  
  console.log("REPAIRING ACCESS FOR AGUILAS NEGRAS...");
  
  // 1. Vincular el perfil del director al club activo
  const { error: updateError } = await supabase
    .from('perfiles')
    .update({ club_id: activeClubId })
    .eq('id', directorProfileId);
  
  if (updateError) {
    console.error("Error updating profile:", updateError);
    return;
  }
  console.log("Profile linked to Active Club.");

  // 2. Asegurar que el club activo tenga el email correcto
  const { error: clubError } = await supabase
    .from('clubes')
    .update({ correo_administrativo: 'aguilasnegras@mcm.com' })
    .eq('id', activeClubId);
  
  // 3. Resetear contraseña de Auth para estar seguros
  const { error: authError } = await supabase.auth.admin.updateUserById(
    directorProfileId,
    { 
        email: 'aguilasnegras@mcm.com',
        password: 'AdminAguilas2026*', // Contraseña temporal segura
        email_confirm: true 
    }
  );

  if (authError) {
    console.error("Error updating auth:", authError);
  } else {
    console.log("Auth credentials updated: aguilasnegras@mcm.com / AdminAguilas2026*");
  }

  // 4. Cambiar el slug del club activo a 'aguilas-negras' para evitar confusiones con 'agilas'
  // Pero primero borrar el slug del club eliminado para que no choque
  await supabase.from('clubes').update({ slug: 'aguilas-old' }).eq('id', '690616df-0f81-4a82-96f6-d71dc66591c9');
  await supabase.from('clubes').update({ slug: 'aguilas-negras' }).eq('id', activeClubId);
  
  console.log("\nREPARACIÓN COMPLETADA.");
  console.log("NUEVA URL DE ACCESO: http://localhost:3000/aguilas-negras/login");
  console.log("USUARIO: aguilasnegras@mcm.com");
  console.log("CLAVE: AdminAguilas2026*");
}

repair();
