-- Migración para añadir filtro de categorías a los Eventos en el módulo de Aportes

-- Añadir columna de array de texto para guardar las categorías a las que aplica el evento
ALTER TABLE public.eventos_deportivos
ADD COLUMN IF NOT EXISTS categorias_destino text[] DEFAULT '{}'::text[];

-- Comentario descriptivo
COMMENT ON COLUMN public.eventos_deportivos.categorias_destino IS 'Arreglo con los nombres de las categorías/grupos a los que va dirigido el evento. Si está vacío, aplica a todos o usa la tabla convocatorias.';
