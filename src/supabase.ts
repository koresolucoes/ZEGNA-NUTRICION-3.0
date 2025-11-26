
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
-- V24.0 SCRIPT DE MIGRACIÓN (Contexto Clínico Completo + Citas)
-- Actualiza la función 'get_my_data_for_ai' para incluir:
-- 1. Alergias, historial médico y hábitos.
-- 2. Lista de próximas citas programadas.
-- =================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_data_for_ai(p_person_id uuid, day_offset integer DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_date DATE;
    diet_record RECORD;
    exercise_record RECORD;
    person_record RECORD;
    allergies_record json;
    history_record json;
    habits_record RECORD;
    appointments_record json;
    plan_status TEXT;
    result json;
BEGIN
    target_date := (now() + (day_offset || ' days')::interval)::date;

    -- 1. Get Basic Person Info
    SELECT full_name, health_goal, subscription_end_date INTO person_record
    FROM public.persons WHERE id = p_person_id;
    
    -- 2. Get Allergies (Aggregated)
    SELECT json_agg(json_build_object('substance', substance, 'severity', severity)) 
    INTO allergies_record
    FROM public.allergies_intolerances WHERE person_id = p_person_id;

    -- 3. Get Medical History (Aggregated)
    SELECT json_agg(json_build_object('condition', condition))
    INTO history_record
    FROM public.medical_history WHERE person_id = p_person_id;
    
    -- 4. Get Lifestyle Habits
    SELECT * INTO habits_record FROM public.lifestyle_habits WHERE person_id = p_person_id;

    -- 5. Get Upcoming Appointments (Next 3 scheduled)
    SELECT json_agg(json_build_object('date', start_time, 'title', title))
    INTO appointments_record
    FROM (
        SELECT start_time, title 
        FROM public.appointments 
        WHERE person_id = p_person_id 
          AND status = 'scheduled' 
          AND start_time > now()
        ORDER BY start_time ASC
        LIMIT 3
    ) AS sub;

    -- 6. Determine Plan Status
    IF person_record.subscription_end_date IS NULL OR person_record.subscription_end_date < CURRENT_DATE THEN
        plan_status := 'inactive';
    ELSE
        plan_status := 'active';
    END IF;

    -- 7. Get Diet for Target Date
    SELECT * INTO diet_record FROM public.diet_logs
    WHERE person_id = p_person_id AND log_date = target_date
    LIMIT 1;

    -- 8. Get Exercise for Target Date
    SELECT * INTO exercise_record FROM public.exercise_logs
    WHERE person_id = p_person_id AND log_date = target_date
    LIMIT 1;

    -- 9. Construct JSON Result
    result := json_build_object(
        'profile', json_build_object(
            'name', person_record.full_name,
            'health_goal', person_record.health_goal,
            'plan_status', plan_status,
            'subscription_end', person_record.subscription_end_date
        ),
        'clinical_context', json_build_object(
             'allergies', COALESCE(allergies_record, '[]'::json),
             'conditions', COALESCE(history_record, '[]'::json),
             'habits', json_build_object(
                'smokes', habits_record.smokes,
                'alcohol', habits_record.alcohol_frequency
             )
        ),
        'upcoming_appointments', COALESCE(appointments_record, '[]'::json),
        'target_date', target_date,
        'diet_plan', CASE WHEN diet_record.id IS NULL THEN NULL ELSE json_build_object(
            'breakfast', diet_record.desayuno,
            'snack1', diet_record.colacion_1,
            'lunch', diet_record.comida,
            'snack2', diet_record.colacion_2,
            'dinner', diet_record.cena,
            'completed', diet_record.completed
        ) END,
        'exercise_plan', CASE WHEN exercise_record.id IS NULL THEN NULL ELSE json_build_object(
            'focus', exercise_record.enfoque,
            'exercises', exercise_record.ejercicios,
            'completed', exercise_record.completed
        ) END
    );

    RETURN result;
END;
$$;

COMMIT;
-- =================================================================
-- Fin del Script de Migración V24.0
-- =================================================================


-- =================================================================
-- V23.0 SCRIPT DE MIGRACIÓN (Chat Multimedia)
-- Ejecuta este script para habilitar imágenes y audios en el chat.
-- =================================================================
BEGIN;

-- 1. Actualizar la tabla de conversaciones
ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text', -- 'text', 'image', 'audio'
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS mime_type text;

-- 2. Crear el Bucket de Almacenamiento 'chat-media'
-- Nota: Si el bucket ya existe, esta parte puede dar error o ser ignorada.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar Políticas de Seguridad (RLS) para el Bucket
-- Permitir acceso público de lectura (para que las imágenes carguen en el chat)
CREATE POLICY "Acceso público a media de chat"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-media' );

-- Permitir subida a usuarios autenticados (y al service role del backend)
CREATE POLICY "Subida de media de chat autenticada"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'chat-media' );

COMMIT;
-- =================================================================
-- Fin del Script de Migración
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
