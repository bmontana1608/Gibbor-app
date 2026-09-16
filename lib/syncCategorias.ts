import { supabase } from '@/lib/supabase';

/**
 * Calcula la edad exacta en años a partir de una fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad;
}

/**
 * Sincroniza las categorías de todos los jugadores activos de un club
 * basándose en su edad actual y los rangos de las categorías.
 * Respeta a los jugadores que han sido asignados manualmente (sufijo |MANUAL).
 */
export async function syncCategoriasInteligentes(club_id: string) {
  if (!club_id) return false;

  try {
    // 1. Obtener todas las categorías activas del club
    const { data: categorias } = await supabase
      .from('categorias')
      .select('id, nombre, edad_minima, edad_maxima')
      .eq('club_id', club_id)
      .eq('estado', 'Activo');

    if (!categorias || categorias.length === 0) return true; // Nada que sincronizar

    // 2. Obtener todos los futbolistas activos del club
    const { data: jugadores } = await supabase
      .from('perfiles')
      .select('id, nombres, fecha_nacimiento, grupos')
      .eq('club_id', club_id)
      .eq('rol', 'Futbolista')
      .eq('estado_miembro', 'Activo');

    if (!jugadores || jugadores.length === 0) return true;

    // 3. Procesar y encontrar a los que necesitan actualización
    const actualizaciones = [];

    for (const jug of jugadores) {
      // Ignorar a los que fueron fijados manualmente por talento
      if (jug.grupos && jug.grupos.includes('|MANUAL')) {
        continue;
      }

      const edad = calcularEdad(jug.fecha_nacimiento);
      const anioNacimiento = jug.fecha_nacimiento ? new Date(jug.fecha_nacimiento).getFullYear() : 0;
      
      // Buscar la categoría adecuada para esta edad o año de nacimiento
      const categoriaIdeal = categorias.find(c => {
        if (c.edad_minima > 100) {
          // Clasificación por Año de Nacimiento (ej. 2014 a 2016)
          return anioNacimiento >= c.edad_minima && anioNacimiento <= c.edad_maxima;
        } else {
          // Clasificación por edad en años
          return edad >= c.edad_minima && edad <= c.edad_maxima;
        }
      });

      if (categoriaIdeal) {
        // Si no tiene grupo, o el grupo actual es distinto a su categoría ideal, lo actualizamos
        if (!jug.grupos || jug.grupos !== categoriaIdeal.nombre) {
          actualizaciones.push({
            id: jug.id,
            grupos: categoriaIdeal.nombre
          });
        }
      } else {
        // Si no entra en ninguna categoría, podríamos dejarlo sin grupo o no hacer nada.
        // Por ahora no hacemos nada para evitar sacarlos por error.
      }
    }

    // 4. Actualizar en base de datos si hay cambios
    if (actualizaciones.length > 0) {
      console.log(`[Sync] Actualizando categorías para ${actualizaciones.length} jugadores por cambio de edad.`);
      
      // Supabase no tiene updateMany nativo fácil, así que iteramos o usamos upsert
      for (const act of actualizaciones) {
        await supabase
          .from('perfiles')
          .update({ grupos: act.grupos })
          .eq('id', act.id);
      }
    }

    return true;
  } catch (error) {
    console.error("Error en syncCategoriasInteligentes:", error);
    return false;
  }
}
