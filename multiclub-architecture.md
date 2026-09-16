/**
 * ESTRUCTURA MULTICLUB (SAAS) - GIBBOR APP
 * Este archivo define los campos necesarios para la nueva tabla 'clubes'
 * y cómo se relacionarán los datos. SOLO PARA USO LOCAL POR AHORA.
 */

export interface ClubConfig {
  id: string; // UUID
  nombre: string;
  slug: string; // Usado para subdominio (ej: 'millonarios')
  logo_url: string;
  color_primario: string; // Hex (ej: #FF9900)
  color_secundario: string;
  temporada_actual: string;
  plan_activo: 'Gratis' | 'Pro' | 'Elite';
  configuracion_wa?: {
    telefono: string;
    instancia_api: string;
    token_api: string;
  }
}

/**
 * CAMBIOS REQUERIDOS EN TABLAS EXISTENTES:
 * Todas estas tablas DEBEN tener una columna 'club_id' (UUID):
 * - perfiles
 * - pagos_ingresos
 * - asistencias
 * - eventos
 * - evaluaciones_tecnicas
 * - planes
 * - categorias
 */
