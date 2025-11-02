
import React, { FC, useState, FormEvent } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';

const CollaboratorFormPage: FC<{ onBack: () => void; }> = ({ onBack }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        contact_email: '',
        specialty: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) { setError("No se pudo identificar la clínica."); return; }
        if (!formData.contact_email) { 
            setError("El correo electrónico es obligatorio para enviar una invitación."); 
            return; 
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const { error: rpcError } = await supabase.rpc('invite_ally_to_clinic', {
                p_clinic_id: clinic.id,
                p_contact_email: formData.contact_email,
                p_full_name: formData.full_name || 'Nuevo Colaborador',
                p_specialty: formData.specialty || 'No especificado',
                p_phone_number: formData.phone_number || null
            });

            if (rpcError) throw rpcError;
            
            setSuccess(`Se ha enviado una invitación a ${formData.contact_email} para unirse a tu red de colaboradores.`);

            setTimeout(() => {
                onBack();
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '7rem' }}>
            <div style={styles.pageHeader}>
                <h1>Invitar Colaborador a la Red</h1>
                <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
            </div>
            <p style={{marginTop: '-1rem', marginBottom: '2rem', color: 'var(--text-light)', maxWidth: '600px'}}>
                Invita a otros profesionales a tu red. Podrán recibir referidos tuyos y enviarte referidos directamente a través de la plataforma una vez que acepten la invitación.
            </p>
            <form id="aliado-form" onSubmit={handleSubmit} style={{maxWidth: '600px'}}>
                {error && <p style={styles.error}>{error}</p>}
                {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                
                <label htmlFor="contact_email">Correo Electrónico del Profesional*</label>
                <input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} placeholder="email@profesional.com" required />
                
                <label htmlFor="full_name">Nombre del Profesional</label>
                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} />
                
                <label htmlFor="specialty">Especialidad</label>
                <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleChange} placeholder="Ej: Médico General, Entrenador Personal" />

                <label htmlFor="phone_number">Teléfono</label>
                <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} />
                
            </form>
             <div style={styles.floatingActions}>
                <button type="button" onClick={onBack} className="button-secondary">Cancelar</button>
                <button type="submit" form="aliado-form" disabled={loading || !!success} style={styles.floatingSaveButton} aria-label="Enviar Invitación">
                    {loading ? '...' : ICONS.send}
                </button>
            </div>
        </div>
    );
};

export default CollaboratorFormPage;