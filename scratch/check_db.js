const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dgsibtuzqzuyeudbgnaq.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data, error } = await supabase.from('notificaciones_app').select('*').limit(1);
  if (error) {
    console.error("Error fetching notificaciones_app:", error);
  } else {
    console.log("notificaciones_app exists, data count:", data.length);
  }

  const { data: pData, error: pError } = await supabase.from('perfiles').select('id').limit(1);
  if (pError) {
    console.error("Error fetching perfiles:", pError);
  } else {
    console.log("perfiles exists.");
  }
}

check();
