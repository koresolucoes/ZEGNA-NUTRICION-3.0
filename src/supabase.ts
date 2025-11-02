

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
-- V25.0 SCRIPT DE MIGRACIÓN (Optimización de Lista de Pacientes)
-- Esta función RPC recupera eficientemente la fecha de la última
-- consulta para una lista de IDs de personas.
-- =================================================================
BEGIN;

CREATE OR REPLACE FUNCTION get_last_consultation_for_persons(p_person_ids uuid[])
RETURNS TABLE(person_id uuid, last_consultation_date date) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.person_id,
        MAX(c.consultation_date) as last_consultation_date
    FROM 
        public.consultations c
    WHERE 
        c.person_id = ANY(p_person_ids)
    GROUP BY 
        c.person_id;
END;
$$ LANGUAGE plpgsql;

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


-- =================================================================
-- V21.0 SCRIPT DE MIGRACIÓN (Normalización Robusta de Teléfonos)
-- Este script mejora el reconocimiento de pacientes desde WhatsApp.
-- =================================================================
BEGIN;

-- 1. Añade la nueva columna a la tabla 'persons' para almacenar el número normalizado.
ALTER TABLE public.persons
ADD COLUMN IF NOT EXISTS normalized_phone_number TEXT;

-- Crea un índice en la nueva columna para acelerar las búsquedas.
CREATE INDEX IF NOT EXISTS idx_persons_normalized_phone ON public.persons(normalized_phone_number);

-- 2. Crea una función de trigger que normalizará automáticamente el número de teléfono.
CREATE OR REPLACE FUNCTION public.normalize_person_phone_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Elimina todos los caracteres que no sean dígitos del 'phone_number'
    -- y lo asigna a la nueva columna.
    NEW.normalized_phone_number := regexp_replace(NEW.phone_number, '\D', '', 'g');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crea el trigger en la tabla 'persons'.
-- Se ejecutará antes de cualquier operación de inserción o actualización.
DROP TRIGGER IF EXISTS trg_normalize_person_phone ON public.persons;
CREATE TRIGGER trg_normalize_person_phone
BEFORE INSERT OR UPDATE ON public.persons
FOR EACH ROW
EXECUTE FUNCTION public.normalize_person_phone_number();

-- 4. Ejecuta una actualización única para poblar la columna 'normalized_phone_number'
-- para todos los registros existentes. Esto es crucial para que la nueva lógica funcione
-- con tus datos actuales.
UPDATE public.persons
SET normalized_phone_number = regexp_replace(phone_number, '\D', '', 'g')
WHERE normalized_phone_number IS NULL OR normalized_phone_number <> regexp_replace(phone_number, '\D', '', 'g');

COMMIT;
-- =================================================================
-- Fin del Script de Migración
-- =================================================================


-- =================================================================
-- V20.1 DATABASE MIGRATION SCRIPT (Zegna Affiliate Program - Backend Logic)
-- =================================================================
BEGIN;

-- 1. Update create_initial_clinic to handle referral codes
CREATE OR REPLACE FUNCTION public.create_initial_clinic(
    name text,
    phone_number text DEFAULT NULL::text,
    email text DEFAULT NULL::text,
    address text DEFAULT NULL::text,
    website text DEFAULT NULL::text)
RETURNS public.clinics
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_clinic public.clinics;
    user_meta jsonb;
    ref_code TEXT;
    affiliate_link_record RECORD;
BEGIN
    -- Get referral code from the inviting user's metadata
    SELECT raw_user_meta_data INTO user_meta FROM auth.users WHERE id = auth.uid();
    ref_code := user_meta->>'referral_code';

    -- Insert the new clinic record, including the referral code if it exists
    INSERT INTO public.clinics (owner_id, name, phone_number, email, address, website, referred_by_code)
    VALUES (auth.uid(), create_initial_clinic.name, create_initial_clinic.phone_number, create_initial_clinic.email, create_initial_clinic.address, create_initial_clinic.website, ref_code)
    RETURNING * INTO new_clinic;

    -- Add the owner as an admin member of the new clinic
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (new_clinic.id, auth.uid(), 'admin');
    
    -- If a referral code was used, create a pending affiliate event
    IF ref_code IS NOT NULL AND ref_code <> '' THEN
        -- Find the affiliate link corresponding to the code
        SELECT id INTO affiliate_link_record FROM public.affiliate_links WHERE code = ref_code;
        
        IF affiliate_link_record.id IS NOT NULL THEN
            -- Insert a pending event
            INSERT INTO public.affiliate_events (affiliate_link_id, referred_clinic_id, referred_user_id, status)
            VALUES (affiliate_link_record.id, new_clinic.id, auth.uid(), 'pending');
            
            -- Increment the click/usage count on the link
            UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE id = affiliate_link_record.id;
        END IF;
    END IF;

    RETURN new_clinic;
END;
$$;
COMMENT ON FUNCTION public.create_initial_clinic IS 'Creates a new clinic, adds the creator as an admin, and processes any referral code used during signup.';


-- 2. Function to process commission when a subscription becomes active
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    affiliate_event_record RECORD;
    affiliate_program_record RECORD;
    plan_record RECORD;
    commission NUMERIC;
BEGIN
    -- Check if the subscription is becoming 'active'
    IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status <> 'active') THEN
        
        -- Find the corresponding pending affiliate event for this clinic
        SELECT * INTO affiliate_event_record 
        FROM public.affiliate_events 
        WHERE referred_clinic_id = NEW.clinic_id AND status = 'pending'
        LIMIT 1;
        
        -- If a pending event is found
        IF affiliate_event_record.id IS NOT NULL THEN
            -- Get the affiliate program details
            SELECT ap.* INTO affiliate_program_record
            FROM public.affiliate_programs ap
            JOIN public.affiliate_links al ON ap.id = al.program_id
            WHERE al.id = affiliate_event_record.affiliate_link_id;
            
            -- Get the subscription plan details
            SELECT * INTO plan_record FROM public.plans WHERE id = NEW.plan_id;

            -- Calculate commission if it's a monetary type
            IF affiliate_program_record.reward_type = 'monetary_commission' THEN
                -- Assuming reward_value is a fixed amount for now, as per the default program.
                commission := affiliate_program_record.reward_value;
            ELSE
                commission := 0; -- Or handle service credits differently
            END IF;
            
            -- Update the affiliate event to 'approved'
            UPDATE public.affiliate_events
            SET 
                status = 'approved',
                commission_amount = commission,
                subscription_payment_id = NEW.id,
                updated_at = now()
            WHERE id = affiliate_event_record.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Trigger that fires after a subscription is created or updated
DROP TRIGGER IF EXISTS on_subscription_activation ON public.clinic_subscriptions;
CREATE TRIGGER on_subscription_activation
AFTER INSERT OR UPDATE ON public.clinic_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.process_affiliate_commission();

COMMIT;
-- =================================================================
-- Fin del Script de Migración
-- =================================================================


-- =================================================================
-- V20.0 DATABASE MIGRATION SCRIPT (Zegna Affiliate Program - System A)
-- =================================================================
BEGIN;

-- 1. Create affiliate_programs table
CREATE TABLE IF NOT EXISTS public.affiliate_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    reward_type text NOT NULL CHECK (reward_type IN ('monetary_commission', 'service_credit')),
    reward_value numeric(10, 2) NOT NULL,
    duration_days integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.affiliate_programs IS 'Defines affiliate campaigns for referring new clinics.';

-- 2. Create affiliate_links table
CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id uuid NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    clicks integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.affiliate_links IS 'Stores unique referral codes for each affiliate.';

-- 3. Create affiliate_events table
CREATE TABLE IF NOT EXISTS public.affiliate_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
    referred_clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    referred_user_id uuid NOT NULL REFERENCES auth.users(id),
    subscription_payment_id uuid,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    commission_amount numeric(10, 2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.affiliate_events IS 'Tracks referral conversions and commission status.';

-- 4. Add referral_code column to clinics table
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS referred_by_code text;
COMMENT ON COLUMN public.clinics.referred_by_code IS 'Stores the affiliate code used during clinic creation.';

-- RLS Policies
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can manage their own links" ON public.affiliate_links;
CREATE POLICY "Affiliates can manage their own links" ON public.affiliate_links
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Affiliates can view their own events" ON public.affiliate_events;
CREATE POLICY "Affiliates can view their own events" ON public.affiliate_events
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.affiliate_links
    WHERE affiliate_links.id = affiliate_events.affiliate_link_id AND affiliate_links.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Authenticated users can read programs" ON public.affiliate_programs;
CREATE POLICY "Authenticated users can read programs" ON public.affiliate_programs
FOR SELECT USING (auth.role() = 'authenticated');

-- 5. RPC to generate an affiliate link for a user
CREATE OR REPLACE FUNCTION public.create_user_affiliate_link(p_program_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_code TEXT;
    user_profile RECORD;
    new_link RECORD;
BEGIN
    -- Check if user already has a link for this program
    PERFORM 1 FROM public.affiliate_links WHERE user_id = auth.uid() AND program_id = p_program_id;
    IF FOUND THEN
        RAISE EXCEPTION 'User already has a link for this program.';
    END IF;

    -- Get user's full name to generate a code
    SELECT full_name INTO user_profile FROM public.nutritionist_profiles WHERE user_id = auth.uid();
    
    IF user_profile.full_name IS NULL THEN
        RAISE EXCEPTION 'User profile not found or name is missing.';
    END IF;
    
    -- Generate a unique code (e.g., JUANP-XYZ)
    new_code := UPPER(REGEXP_REPLACE(user_profile.full_name, '\s.*', '')) || '-' || UPPER(SUBSTRING(md5(random()::text) FOR 3));

    WHILE EXISTS (SELECT 1 FROM public.affiliate_links WHERE code = new_code) LOOP
        new_code := UPPER(REGEXP_REPLACE(user_profile.full_name, '\s.*', '')) || '-' || UPPER(SUBSTRING(md5(random()::text) FOR 3));
    END LOOP;
    
    -- Insert the new link and return it
    INSERT INTO public.affiliate_links (user_id, program_id, code)
    VALUES (auth.uid(), p_program_id, new_code)
    RETURNING * INTO new_link;
    
    RETURN row_to_json(new_link);
END;
$$;

-- 6. Insert a default program
INSERT INTO public.affiliate_programs (id, name, description, reward_type, reward_value, is_active)
VALUES ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Programa General de Afiliados', 'Gana una comisión por cada nueva clínica que se suscriba a Zegna a través de tu enlace.', 'monetary_commission', 250, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
-- =================================================================
-- Fin del Script de Migración
-- =================================================================


-- =================================================================
-- V18.1 DATABASE MIGRATION SCRIPT (Mercado Pago Integration)
-- This script adds columns to track Mercado Pago subscription IDs.
-- =================================================================
BEGIN;

-- 1. Add Mercado Pago identifiers to the subscriptions table.
ALTER TABLE public.clinic_subscriptions
ADD COLUMN IF NOT EXISTS mercadopago_subscription_id text,
ADD COLUMN IF NOT EXISTS mercadopago_plan_id text;

COMMENT ON COLUMN public.clinic_subscriptions.mercadopago_subscription_id IS 'Stores the preapproval ID from Mercado Pago.';
COMMENT ON COLUMN public.clinic_subscriptions.mercadopago_plan_id IS 'Stores the preapproval_plan_id from Mercado Pago.';

COMMIT;
-- =================================================================
-- Fin del Script de Migración
-- =================================================================


-- =================================================================
-- V18.0 DATABASE MIGRATION SCRIPT (Subscription Management)
-- This script adds tables for managing SaaS plans and clinic subscriptions.
-- =================================================================
BEGIN;

-- 1. Create the 'plans' table to define subscription tiers.
CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price_monthly numeric(10, 2) NOT NULL,
    price_yearly numeric(10, 2) NOT NULL,
    max_professionals integer NOT NULL DEFAULT 1,
    features jsonb, -- e.g., {"ai_assistant": true, "max_patients": 500}
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.plans IS 'Defines the different subscription plans available for clinics.';

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans are publicly viewable" ON public.plans;
CREATE POLICY "Plans are publicly viewable"
ON public.plans FOR SELECT
USING (true);

-- 2. Create the 'clinic_subscriptions' table to track each clinic's plan.
CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.plans(id),
    status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.clinic_subscriptions IS 'Tracks the subscription status for each clinic.';

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clinic members can view their own subscription" ON public.clinic_subscriptions;
CREATE POLICY "Clinic members can view their own subscription"
ON public.clinic_subscriptions FOR SELECT
USING (is_clinic_member(clinic_id));

-- 3. Pre-populate with some example plans.
INSERT INTO public.plans (name, description, price_monthly, price_yearly, max_professionals, features)
VALUES
  ('Gratis', 'Para profesionales que recién comienzan.', 0, 0, 1, '{"max_patients": 25, "ai_assistant": false, "branding": true}'),
  ('Pro', 'Para consultorios en crecimiento con múltiples profesionales.', 499, 4990, 5, '{"max_patients": 1000, "ai_assistant": true, "branding": true}'),
  ('Business', 'Para clínicas grandes y redes de nutricionistas.', 1299, 12990, 20, '{"max_patients": -1, "ai_assistant": true, "branding": false, "api_access": true}')
ON CONFLICT (name) DO NOTHING;

COMMIT;
-- =================================================================
-- Fin del Script de Migración
-- =================================================================
*/