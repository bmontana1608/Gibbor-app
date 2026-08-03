import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Función maestra para registrar acciones críticas en el sistema.
 * Esto asegura que MCM tenga trazabilidad total (Audit Trail).
 */
export async function logAction({
  userId,
  clubId,
  accion,
  descripcion,
  metadata = {}
}: {
  userId: string,
  clubId: string,
  accion: string,
  descripcion: string,
  metadata?: any
}) {
  try {
    const { error } = await supabaseAdmin
      .from('logs_auditoria')
      .insert([{
        usuario_id: userId,
        club_id: clubId,
        accion,
        descripcion,
        metadata,
        fecha: new Date().toISOString()
      }]);

    if (error) console.error("Error al registrar log:", error);
  } catch (err) {
    console.error("Falla crítica en sistema de logs:", err);
  }
}
