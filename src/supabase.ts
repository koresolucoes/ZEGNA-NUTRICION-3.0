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
-- V25.0 SCRIPT DE MIGRACIÓN (Análisis de Progreso para IA)
-- Crea una función para obtener historial clínico y comparar progreso.
-- =================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_patient_progress(p_person_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    history_records json;
    gamification_record RECORD;
    adherence_stats json;
    result json;
BEGIN
    -- 1. Get Consultation History (Weight, BMI, Labs) - Last 10 records ordered chronologically
    SELECT json_agg(row_to_json(t))
    INTO history_records
    FROM (
        SELECT 
            c.consultation_date,
            c.weight_kg,
            c.imc,
            c.ta,
            l.glucose_mg_dl,
            l.cholesterol_mg_dl,
            l.triglycerides_mg_dl,
            l.hba1c
        FROM public.consultations c
        LEFT JOIN public.lab_results l ON l.consultation_id = c.id
        WHERE c.person_id = p_person_id
        ORDER BY c.consultation_date ASC
        LIMIT 10
    ) t;

    -- 2. Get Gamification Stats
    SELECT gamification_points, gamification_rank INTO gamification_record
    FROM public.persons WHERE id = p_person_id;

    -- 3. Calculate Adherence (Last 30 days)
    SELECT json_build_object(
        'diet_logs_total', COUNT(d.id),
        'diet_logs_completed', COUNT(d.id) FILTER (WHERE d.completed = true),
        'exercise_logs_total', COUNT(e.id),
        'exercise_logs_completed', COUNT(e.id) FILTER (WHERE e.completed = true)
    ) INTO adherence_stats
    FROM public.persons p
    LEFT JOIN public.diet_logs d ON d.person_id = p.id AND d.log_date >= (CURRENT_DATE - INTERVAL '30 days')
    LEFT JOIN public.exercise_logs e ON e.person_id = p.id AND e.log_date >= (CURRENT_DATE - INTERVAL '30 days')
    WHERE p.id = p_person_id
    GROUP BY p.id;

    -- 4. Construct Result
    result := json_build_object(
        'history', COALESCE(history_records, '[]'::json),
        'gamification', json_build_object(
            'points', gamification_record.gamification_points,
            'rank', gamification_record.gamification_rank
        ),
        'last_30_days_adherence', adherence_stats
    );

    RETURN result;
END;
$$;

COMMIT;
-- =================================================================
-- Fin del Script de Migración V25.0
-- =================================================================


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
*/