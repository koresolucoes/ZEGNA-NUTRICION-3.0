import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!serviceRoleKey) {
    console.error('Supabase service role key is not configured.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { person_id, email } = req.body;

    if (!person_id || !email) {
      return res.status(400).json({ error: 'Faltan campos requeridos: person_id, email.' });
    }

    // 1. Check if person already has a linked user account
    const { data: personData, error: personError } = await supabaseAdmin
        .from('persons')
        .select('user_id')
        .eq('id', person_id)
        .single();
    
    if (personError) throw personError;
    if (personData.user_id) {
        return res.status(409).json({ error: 'Este paciente ya tiene una cuenta de usuario vinculada.' });
    }
    
    // 2. Use Supabase Admin API to invite the user.
    // The data payload will be used by our new database trigger to link the person record.
    const { error: inviteError } = await (supabaseAdmin.auth as any).admin.inviteUserByEmail(email, {
      data: {
        is_patient_invitation: true,
        person_id_to_link: person_id,
      },
      redirectTo: `${req.headers.origin}`, // Redirect back to the main app page after they click the link
    });

    if (inviteError) {
      // Provide more user-friendly error messages
      if (inviteError.message.includes('User is already invited')) {
        return res.status(409).json({ error: 'Este paciente ya ha sido invitado a ese correo. Pídele que revise su email (incluyendo spam).' });
      }
      if (inviteError.message.includes('already been registered')) {
         return res.status(409).json({ error: 'Un usuario con este correo electrónico ya existe en el sistema y no puede ser invitado. Si es el paciente, debe usar la opción "Olvidé mi contraseña".' });
      }
      throw inviteError;
    }

    res.status(200).json({ message: `¡Invitación enviada a ${email}!` });
  } catch (error: any) {
    console.error('Error in /api/invite-patient:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error inesperado al invitar al paciente.' });
  }
}