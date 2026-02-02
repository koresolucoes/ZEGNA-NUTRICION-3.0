
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
-- V35.0 SCRIPT DE MIGRACIÓN: SISTEMA DE GAMIFICACIÓN
-- Ejecuta este script en el Editor SQL de Supabase para activar los logros.
-- =================================================================
BEGIN;

-- 1. Crear tabla de historial de gamificación
CREATE TABLE IF NOT EXISTS public.gamification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    points_awarded integer NOT NULL,
    reason text NOT NULL,
    related_log_id uuid, -- Opcional: enlace a diet_logs o exercise_logs
    related_appointment_id uuid, -- Opcional: enlace a appointments
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.gamification_log ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden ver sus propios puntos, pero solo el sistema (funciones) inserta
DROP POLICY IF EXISTS "Usuarios ven sus propios puntos" ON public.gamification_log;
CREATE POLICY "Usuarios ven sus propios puntos" ON public.gamification_log
    FOR SELECT USING (
        person_id IN (
            SELECT id FROM public.persons WHERE user_id = auth.uid()
        )
    );

-- 2. Trigger para actualizar el resumen en la tabla 'persons' automáticamente
CREATE OR REPLACE FUNCTION public.update_person_gamification_stats()
RETURNS TRIGGER AS $$
DECLARE
    total_score INTEGER;
    new_rank TEXT;
BEGIN
    -- Calcular total
    SELECT COALESCE(SUM(points_awarded), 0) INTO total_score
    FROM public.gamification_log
    WHERE person_id = NEW.person_id;

    -- Determinar Rango
    IF total_score >= 1000 THEN new_rank := 'Platino';
    ELSIF total_score >= 600 THEN new_rank := 'Oro';
    ELSIF total_score >= 300 THEN new_rank := 'Plata';
    ELSIF total_score >= 100 THEN new_rank := 'Bronce';
    ELSE new_rank := 'Novato';
    END IF;

    -- Actualizar perfil del paciente
    UPDATE public.persons
    SET 
        gamification_points = total_score,
        gamification_rank = new_rank
    WHERE id = NEW.person_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_gamification ON public.gamification_log;
CREATE TRIGGER trg_update_gamification
AFTER INSERT OR UPDATE OR DELETE ON public.gamification_log
FOR EACH ROW EXECUTE FUNCTION public.update_person_gamification_stats();


-- 3. Funciones RPC para otorgar puntos de forma segura (Idempotencia)

-- A. Puntos por Check-in Diario (+10 pts)
CREATE OR REPLACE FUNCTION public.award_daily_checkin_points(p_person_id uuid, p_checkin_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verificar si ya se dieron puntos por este checkin específico
    IF NOT EXISTS (SELECT 1 FROM public.gamification_log WHERE related_log_id = p_checkin_id) THEN
        INSERT INTO public.gamification_log (person_id, points_awarded, reason, related_log_id)
        VALUES (p_person_id, 10, 'Check-in Diario', p_checkin_id);
    END IF;
END;
$$;

-- B. Puntos por Completar Plan (+50 pts)
CREATE OR REPLACE FUNCTION public.award_points_for_completed_plan(p_log_id uuid, p_log_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_person_id uuid;
    v_table_name text;
BEGIN
    -- Determinar tabla y obtener person_id
    IF p_log_type = 'diet' THEN
        UPDATE public.diet_logs SET completed = true WHERE id = p_log_id RETURNING person_id INTO v_person_id;
    ELSIF p_log_type = 'exercise' THEN
        UPDATE public.exercise_logs SET completed = true WHERE id = p_log_id RETURNING person_id INTO v_person_id;
    END IF;

    -- Insertar puntos si no existen
    IF v_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.gamification_log WHERE related_log_id = p_log_id) THEN
        INSERT INTO public.gamification_log (person_id, points_awarded, reason, related_log_id)
        VALUES (v_person_id, 50, 'Plan Completado: ' || p_log_type, p_log_id);
    END IF;
END;
$$;

-- C. Puntos por Asistir a Consulta (+100 pts)
CREATE OR REPLACE FUNCTION public.award_points_for_consultation_attendance(p_person_id uuid, p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.gamification_log WHERE related_appointment_id = p_appointment_id) THEN
        INSERT INTO public.gamification_log (person_id, points_awarded, reason, related_appointment_id)
        VALUES (p_person_id, 100, 'Asistencia a Consulta', p_appointment_id);
    END IF;
END;
$$;

COMMIT;
-- =================================================================
-- Fin del Script de Gamificación
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