require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan variables de entorno de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log("📡 Conectando a Supabase:", supabaseUrl);
  const clubId = "8ccc1313-d7f3-42c1-8b91-b97014705694";

  // 1. Diagnóstico de notificaciones_app
  console.log("\n🔍 PROBANDO QUERY 1: notificaciones_app...");
  try {
    const { data, error } = await supabase
      .from('notificaciones_app')
      .select('*')
      .or(`club_id.eq.${clubId},club_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error en notificaciones_app:", error);
    } else {
      console.log("✅ Éxito en notificaciones_app! Registros encontrados:", data.length);
    }
  } catch (e) {
    console.error("❌ Excepción en notificaciones_app:", e.message);
  }

  // 2. Diagnóstico de perfiles
  console.log("\n🔍 PROBANDO QUERY 2: perfiles...");
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, created_at, rol')
      .eq('club_id', clubId)
      .eq('estado_miembro', 'Pendiente')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error en perfiles:", error);
    } else {
      console.log("✅ Éxito en perfiles! Registros encontrados:", data.length);
    }
  } catch (e) {
    console.error("❌ Excepción en perfiles:", e.message);
  }
}

runDiagnostics();
