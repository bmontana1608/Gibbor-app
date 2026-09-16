const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Checking Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Auth list error:", error);
    return;
  }
  console.log("Total Auth Users:", data.users.length);
  data.users.forEach(u => {
    console.log(`- Email: ${u.email} | ID: ${u.id} | Confirmed: ${u.email_confirmed_at}`);
  });
}

check();
