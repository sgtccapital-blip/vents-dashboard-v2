-- =========================================================================
-- Command Center & OpenClaw Agent — Supabase Schema
-- =========================================================================
-- Ejecuta este script en el "SQL Editor" de tu panel de Supabase.
-- Crea la tabla de sincronización global para el estado del dashboard,
-- proyectos, tareas, eventos, notas y memoria de OpenClaw.

CREATE TABLE IF NOT EXISTS public.command_center_state (
    id BIGINT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.command_center_state ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (o mediante tu SUPABASE_KEY / anon key)
CREATE POLICY "Allow read access for anon and service"
    ON public.command_center_state
    FOR SELECT
    USING (true);

-- Política de inserción y actualización
CREATE POLICY "Allow insert/update for anon and service"
    ON public.command_center_state
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Inicializar la fila singleton id = 1 si no existe
INSERT INTO public.command_center_state (id, data, updated_at)
VALUES (1, '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

-- Notificar éxito
COMMENT ON TABLE public.command_center_state IS 'Estado persistente en la nube para SGTC Command Center y OpenClaw Agent';
