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
-- V26.0 SCRIPT DE CORRECCIÓN (Registro de Aliados)
-- Corrige el trigger handle_new_user_setup para incluir el campo obligatorio 'specialty'.
-- POR FAVOR, EJECUTA ESTE SCRIPT EN TU EDITOR SQL DE SUPABASE.
-- =================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  meta_data jsonb := new.raw_user_meta_data;
  ally_profile_id uuid;
BEGIN
  -- CASO 1: Inscripción de Aliado (Colaborador)
  IF (meta_data->>'is_ally_signup')::boolean IS TRUE THEN
    SELECT id INTO ally_profile_id
    FROM public.allies
    WHERE contact_email = new.email AND user_id IS NULL;

    IF ally_profile_id IS NOT NULL THEN
      -- Si el perfil ya existía (por invitación), lo actualizamos y vinculamos
      UPDATE public.allies
      SET user_id = new.id,
          full_name = COALESCE((meta_data->>'full_name'), full_name),
          -- Actualizamos especialidad si viene en metadatos
          specialty = COALESCE((meta_data->>'specialty'), specialty)
      WHERE id = ally_profile_id;
    ELSE
      -- Si es un registro nuevo directo
      -- FIX: Incluimos 'specialty' que es NOT NULL en la tabla
      INSERT INTO public.allies (user_id, contact_email, full_name, specialty)
      VALUES (
          new.id, 
          new.email, 
          COALESCE((meta_data->>'full_name'), 'Usuario'),
          COALESCE((meta_data->>'specialty'), 'General') -- Valor por defecto para evitar errores
      );
    END IF;

  -- CASO 2: Invitación de Miembro de la Clínica
  ELSIF meta_data->>'role' IS NOT NULL AND meta_data->>'clinic_id' IS NOT NULL THEN
    INSERT INTO public.clinic_members (user_id, clinic_id, role)
    VALUES (new.id, (meta_data->>'clinic_id')::uuid, (meta_data->>'role')::text);
  
  END IF;

  RETURN new;
END;
$$;

COMMIT;
-- =================================================================
-- Fin del Script de Corrección V26.0
-- =================================================================

-- =================================================================
-- SCRIPT PARA CAPTURA DE FEEDBACK BETA (Temporal)
-- POR FAVOR, EJECUTA ESTE SCRIPT EN TU EDITOR SQL DE SUPABASE.
-- =================================================================
BEGIN;

-- 1. Crear la tabla 'beta_feedback'
CREATE TABLE IF NOT EXISTS public.beta_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
    feedback_type text NOT NULL,
    message text NOT NULL,
    contact_allowed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.beta_feedback IS 'Tabla temporal para recolectar feedback de usuarios beta.';

-- 2. Habilitar RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de RLS
-- Los usuarios autenticados pueden insertar su propio feedback.
DROP POLICY IF EXISTS "Los usuarios pueden enviar su propio feedback" ON public.beta_feedback;
CREATE POLICY "Los usuarios pueden enviar su propio feedback"
ON public.beta_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden ver su propio feedback (opcional, pero buena práctica).
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio feedback" ON public.beta_feedback;
CREATE POLICY "Los usuarios pueden ver su propio feedback"
ON public.beta_feedback FOR SELECT
USING (auth.uid() = user_id);


COMMIT;
-- =================================================================
-- Fin del Script de Feedback
-- =================================================================
*/