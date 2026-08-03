require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function inspectOpenAPI() {
  const url = `${supabaseUrl}/rest/v1/`;
  console.log(`📡 Fetching OpenAPI schema from: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!res.ok) {
      console.error(`❌ HTTP Error: ${res.status}`);
      return;
    }
    
    const schema = await res.json();
    
    // 1. Inspect perfiles
    console.log("\n📋 perfiles columns in OpenAPI schema:");
    const perfilesDef = schema.definitions?.perfiles;
    if (perfilesDef && perfilesDef.properties) {
      Object.entries(perfilesDef.properties).forEach(([name, prop]) => {
        console.log(`- ${name}: ${prop.type} (${prop.description || 'No description'})`);
      });
    } else {
      console.log("Could not find definition for 'perfiles' in schema.");
    }

    // 2. Inspect notificaciones_app
    console.log("\n📋 notificaciones_app columns in OpenAPI schema:");
    const notifDef = schema.definitions?.notificaciones_app;
    if (notifDef && notifDef.properties) {
      Object.entries(notifDef.properties).forEach(([name, prop]) => {
        console.log(`- ${name}: ${prop.type} (${prop.description || 'No description'})`);
      });
    } else {
      console.log("Could not find definition for 'notificaciones_app' in schema.");
    }
    
  } catch (e) {
    console.error("❌ Error fetching OpenAPI schema:", e.message);
  }
}

inspectOpenAPI();
