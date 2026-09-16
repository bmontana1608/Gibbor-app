require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://postgres:YOUR_PASSWORD@') // Just in case, usually DATABASE_URL is in env
  
  if (!process.env.DATABASE_URL) {
     console.error("No DATABASE_URL found in .env.local! Please ensure it's there.");
     return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    
    console.log("Connected to DB, running migrations...");

    const sql = `
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS equipo_rival text;
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS escudo_rival_url text;
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS es_local boolean DEFAULT true;
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS marcador_local int DEFAULT 0;
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS marcador_visitante int DEFAULT 0;
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS estado_partido text DEFAULT 'No Iniciado';

      CREATE TABLE IF NOT EXISTS eventos_minuto_minuto (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id uuid REFERENCES eventos(id) ON DELETE CASCADE,
        minuto integer NOT NULL,
        tipo_accion text NOT NULL,
        jugador_id uuid REFERENCES perfiles(id) ON DELETE SET NULL,
        jugador_sale_id uuid REFERENCES perfiles(id) ON DELETE SET NULL,
        comentario text,
        created_at timestamp with time zone DEFAULT now()
      );

      ALTER TABLE eventos_minuto_minuto ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies WHERE tablename = 'eventos_minuto_minuto' AND policyname = 'Lectura para autenticados'
          ) THEN
              CREATE POLICY "Lectura para autenticados" ON eventos_minuto_minuto FOR SELECT TO authenticated USING (true);
          END IF;
      END
      $$;

      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM pg_publication_tables
              WHERE pubname = 'supabase_realtime' AND tablename = 'eventos_minuto_minuto'
          ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE eventos_minuto_minuto;
          END IF;
      END
      $$;
    `;

    await client.query(sql);
    console.log("Migrations applied successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigrations();
