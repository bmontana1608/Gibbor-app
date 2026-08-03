const fs = require('fs');
const { Client } = require('pg');

// Parse .env.local
let connectionString = null;
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const match = envFile.match(/DATABASE_URL=(.*)/) || envFile.match(/DIRECT_URL=(.*)/);
  if (match) {
    connectionString = match[1].trim();
  }
} catch (e) {
  console.error("Error reading .env.local:", e.message);
}

if (!connectionString) {
  console.error("❌ No DATABASE_URL found in .env.local.");
  process.exit(1);
}

async function inspectSchema() {
  console.log("📡 Connecting directly to PostgreSQL...");
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Inspect perfiles
    console.log("\n📋 COLUMNS IN TABLE 'perfiles':");
    const perfRes = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'perfiles'
      ORDER BY ordinal_position;
    `);
    
    if (perfRes.rows.length === 0) {
      console.log("No columns found (does the table exist?)");
    } else {
      perfRes.rows.forEach(r => {
        console.log(`- ${r.column_name} (${r.data_type}) ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    // Inspect notificaciones_app
    console.log("\n📋 COLUMNS IN TABLE 'notificaciones_app':");
    const notifRes = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_app'
      ORDER BY ordinal_position;
    `);
    
    if (notifRes.rows.length === 0) {
      console.log("No columns found (does the table exist?)");
    } else {
      notifRes.rows.forEach(r => {
        console.log(`- ${r.column_name} (${r.data_type}) ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

  } catch (err) {
    console.error("❌ SQL Query failed:", err.message);
  } finally {
    await client.end();
  }
}

inspectSchema();
