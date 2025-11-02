import { createClient } from '@supabase/supabase-js';

// This function handles POST requests to invite a user to a clinic.
// It uses Supabase's admin privileges and should be deployed as a serverless function.
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Supabase connection details should be stored as environment variables in your hosting provider.
  // The user should provide SUPABASE_SERVICE_ROLE_KEY. The URL can be hardcoded if needed but env var is better.
  const supabaseUrl = process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!serviceRoleKey) {
    console.error('Supabase service role key is not configured as an environment variable.');
    // Do not expose detailed errors to the client
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  // Initialize the Supabase client with admin privileges
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { email, role, clinic_id } = req.body;

    // Validate request body
    if (!email || !role || !clinic_id) {
      return res.status(400).json({ error: 'Missing required fields: email, role, clinic_id are required.' });
    }

    // Use Supabase Admin API to invite a user. This sends a magic link email.
    // The `data` payload will be stored in the user's `user_metadata` upon signup,
    // which our database trigger will use to add them to the clinic.
    // FIX: Property 'admin' does not exist on type 'SupabaseAuthClient'. Cast to any to resolve.
    const { data, error: inviteError } = await (supabaseAdmin.auth as any).admin.inviteUserByEmail(email, {
      data: {
        role: role,
        clinic_id: clinic_id,
      },
      redirectTo: `${req.headers.origin}`, // Redirect back to the main app page after they click the link
    });

    if (inviteError) {
      // Provide more user-friendly error messages for common cases
      if (inviteError.message.includes('User is already invited')) {
        return res.status(409).json({ error: 'Este usuario ya ha sido invitado. Pídeles que revisen su correo electrónico.' });
      }
      if (inviteError.message.includes('already been registered')) {
         return res.status(409).json({ error: 'Un usuario con este correo electrónico ya existe. No se puede enviar una invitación.' });
      }
      // Re-throw other errors to be caught by the generic catch block
      throw inviteError;
    }

    res.status(200).json({ message: `Se ha enviado una invitación a ${email}.` });
  } catch (error: any) {
    console.error('Error in /api/invite:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error inesperado al enviar la invitación.' });
  }
}