const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('pagos_ingresos')
    .select('*')
    .limit(1);
  if (error) {
    console.error('Error fetching pagos_ingresos:', error);
    return;
  }
  console.log('--- PAGOS_INGRESOS RECORD COLUMNS ---');
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
    console.log(data[0]);
  } else {
    console.log('No records found in pagos_ingresos');
  }
}
check();
