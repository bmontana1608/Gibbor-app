require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS crm_whatsapp_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      lead_id UUID REFERENCES atlas_academias(id) ON DELETE SET NULL,
      numero_telefono TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      es_saliente BOOLEAN NOT NULL DEFAULT false,
      leido BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      instancia TEXT NOT NULL DEFAULT 'mcm-ventas'
    );

    -- Enable Row Level Security (we will handle filtering in the API/backend so true RLS might not strictly be necessary, but good practice if used from frontend directly)
    -- In this case we will just do backend queries with service key or authenticated roles.
    
    -- Let's create an index on numero_telefono for faster lookups
    CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_messages_numero ON crm_whatsapp_messages(numero_telefono);
    CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_messages_lead ON crm_whatsapp_messages(lead_id);
  `;

  // We can't execute raw SQL directly via the JS client unless we use a function or rpc.
  // Instead, since it's a supabase project, we can create a migration file and apply it.
  console.log("SQL created.");
}

run();
