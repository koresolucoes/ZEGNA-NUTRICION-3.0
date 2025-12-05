
import { createClient } from '@supabase/supabase-js';
// This assumes you have generated types via `supabase gen types typescript > src/database.types.ts`
import { Database as DB } from './database.types';

export const supabaseUrl = 'https://yjhqvpaxlcjtddjasepb.supabase.co'; // Replace with your Supabase URL
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqaHF2cGF4bGNqdGRkamFzZXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjIyNTYsImV4cCI6MjA3NDE5ODI1Nn0.emisKlyZ8z2mMR_6MDyw2V04DXONuesZXUNO5wDYCfU'; // Replace with your Supabase anon key

// --- VAPID KEYS FOR PUSH NOTIFICATIONS ---
// IMPORTANT: Generate your own VAPID keys using a library like 'web-push'
// and store them as environment variables. The public key is safe to expose here.
// Example: `npx web-push generate-vapid-keys`
export const VAPID_PUBLIC_KEY = 'BN45Z3gmMkuxi1-ZYf7luR6Je88Nu9sEaFmhrCC_cnKwvqg_cRrh3GEHvPWFaOze-GxOvPWSgkNamJOIYn0vtt4'; // <---- REPLACE THIS KEY


export type Database = DB;
// Helper type for JSON columns
// FIX: Point to the correct unified 'logs' table for the attachments JSON type.
export type Json = DB['public']['Tables']['logs']['Row']['attachments'];


const supabaseClient = 
    (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('YOUR_ANON_KEY'))
    ? null
    : createClient<Database>(supabaseUrl, supabaseKey);

if (!supabaseClient) {
    console.warn("Supabase credentials are not set. Please update src/supabase.ts. The app will display a setup message.");
}

// We cast it so TypeScript doesn't complain in other files, but it could be null.
export const supabase = supabaseClient as ReturnType<typeof createClient<Database>>;


/*
-- =================================================================
-- V30.0 SCRIPT: ADICIÓN DE CAMPO DE LAYOUT DE NAVEGACIÓN
-- =================================================================
BEGIN;

-- 1. Añadir columna navigation_layout a la tabla clinics
--    Por defecto 'sidebar' para mantener la consistencia con el diseño actual
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS navigation_layout text DEFAULT 'sidebar';

-- 2. Añadir comentario para documentación
COMMENT ON COLUMN public.clinics.navigation_layout IS 'Define el diseño de navegación del dashboard: "sidebar" (lateral) o "header" (superior).';

COMMIT;
-- =================================================================
-- Fin del Script V30.0
-- =================================================================


-- =================================================================
-- V28.1 SCRIPT: ACTUALIZACIÓN DE ALIMENTOS SMAE CON MACROS
-- =================================================================
BEGIN;

-- 1. Asegurar que la tabla existe (si no corrió el V28.0)
CREATE TABLE IF NOT EXISTS public.smae_foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    subgroup text NOT NULL,
    amount numeric NOT NULL,
    unit text NOT NULL,
    gross_weight numeric,
    net_weight numeric,
    energy_kcal numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Añadir columnas de macronutrientes específicos
ALTER TABLE public.smae_foods 
ADD COLUMN IF NOT EXISTS carb_g numeric DEFAULT NULL,
ALTER TABLE public.smae_foods 
ADD COLUMN IF NOT EXISTS protein_g numeric DEFAULT NULL,
ALTER TABLE public.smae_foods 
ADD COLUMN IF NOT EXISTS lipid_g numeric DEFAULT NULL;

-- 3. Habilitar RLS si no está habilitado
ALTER TABLE public.smae_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden leer alimentos SMAE" ON public.smae_foods;
CREATE POLICY "Todos pueden leer alimentos SMAE" 
ON public.smae_foods FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Actualizar datos de ejemplo con macros específicos (sobreescribir si existen)
-- Frutas (Variaciones reales vs promedio de 15g)
INSERT INTO public.smae_foods (name, subgroup, amount, unit, gross_weight, net_weight, energy_kcal, carb_g, protein_g, lipid_g) VALUES
('Manzana con piel', 'Frutas', 1, 'pieza', 106, 100, 52, 14, 0.3, 0.2),
('Plátano', 'Frutas', 0.5, 'pieza', 80, 80, 70, 18, 0.8, 0.3),
('Fresa', 'Frutas', 1, 'taza', 144, 144, 49, 11, 1.0, 0.5),
('Mango ataulfo', 'Frutas', 0.5, 'pieza', 90, 75, 48, 12, 0.5, 0.2),
('Sandía', 'Frutas', 1, 'taza', 180, 160, 48, 11, 1.0, 0),
('Jugo de naranja', 'Frutas', 0.5, 'taza', 125, 125, 56, 13, 0.9, 0.3)
ON CONFLICT DO NOTHING;

COMMIT;
-- =================================================================
-- Fin del Script V28.1
-- =================================================================
*/