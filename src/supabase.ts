
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
-- SOLUCIÓN DE ERROR DE SUBIDA DE ARCHIVOS (STORAGE RLS)
-- Ejecuta este script en Supabase para configurar los buckets y permisos.
-- =================================================================
BEGIN;

-- 1. Crear buckets necesarios y hacerlos públicos (excepto fiscal-files)
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('log_images', 'log_images', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('fiscal-files', 'fiscal-files', false) ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en objetos de almacenamiento
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para 'files' (Archivos de pacientes)
DROP POLICY IF EXISTS "Authenticated users can upload to files" ON storage.objects;
CREATE POLICY "Authenticated users can upload to files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated users can update their own files" ON storage.objects;
CREATE POLICY "Authenticated users can update their own files" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'files' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete their own files" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'files' AND owner = auth.uid());

DROP POLICY IF EXISTS "Public Read Access for files" ON storage.objects;
CREATE POLICY "Public Read Access for files" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'files');

-- 4. Políticas para 'avatars' (Fotos de perfil y logos)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Read Access for avatars" ON storage.objects;
CREATE POLICY "Public Read Access for avatars" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'avatars');

-- 5. Políticas para 'log_images' (Fotos de comidas)
DROP POLICY IF EXISTS "Authenticated users can upload log images" ON storage.objects;
CREATE POLICY "Authenticated users can upload log images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'log_images');

DROP POLICY IF EXISTS "Public Read Access for log_images" ON storage.objects;
CREATE POLICY "Public Read Access for log_images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'log_images');

-- 6. Políticas para 'fiscal-files' (PRIVADO - Certificados SAT)
DROP POLICY IF EXISTS "Authenticated users can upload fiscal files" ON storage.objects;
CREATE POLICY "Authenticated users can upload fiscal files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fiscal-files');

DROP POLICY IF EXISTS "Authenticated users can read their own fiscal files" ON storage.objects;
CREATE POLICY "Authenticated users can read their own fiscal files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'fiscal-files' AND owner = auth.uid());

COMMIT;
-- =================================================================
-- Fin del Script de Storage
-- =================================================================
*/
