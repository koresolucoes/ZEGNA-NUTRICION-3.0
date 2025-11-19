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

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // High elevation
        width: '100%',
        maxWidth: '650px',
        margin: '4rem auto',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
    };
    
    const inputStyle: React.CSSProperties = {
        ...styles.input,
        padding: '1rem',
        fontSize: '1rem',
        borderRadius: '8px',
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)'
    };

    return (
        <div className="fade-in" style={{ minHeight: '100vh', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={modalStyle}>
                 <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-color)', fontWeight: 700 }}>Invitar Colaborador</h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Envía una invitación por correo para conectar.</p>
                    </div>
                    <button onClick={onBack} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>

                <div style={{ padding: '2.5rem 2rem' }}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <form id="aliado-form" onSubmit={handleSubmit}>
                        <div style={{marginBottom: '2rem'}}>
                            <label htmlFor="contact_email" style={{...styles.label, fontSize: '0.95rem'}}>Correo Electrónico del Profesional *</label>
                            <input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} placeholder="email@profesional.com" required style={inputStyle} autoFocus />
                            <p style={{margin: '-0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>Se enviará una notificación a esta dirección.</p>
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem'}}>
                             <div>
                                <label htmlFor="full_name" style={styles.label}>Nombre (Opcional)</label>
                                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} placeholder="Nombre del Doctor/a" style={inputStyle} />
                             </div>
                             <div>
                                <label htmlFor="specialty" style={styles.label}>Especialidad</label>
                                <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleChange} placeholder="Ej: Psicólogo, Endocrinólogo" style={inputStyle} />
                            </div>
                        </div>

                        <div style={{marginTop: '1.5rem'}}>
                            <label htmlFor="phone_number" style={styles.label}>Teléfono (Opcional)</label>
                            <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} placeholder="Número de contacto" style={inputStyle} />
                        </div>
                    </form>
                </div>

                 <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={onBack} className="button-secondary" style={{padding: '0.75rem 1.5rem', fontSize: '0.9rem'}}>Cancelar</button>
                    <button type="submit" form="aliado-form" disabled={loading || !!success} className="button-primary" style={{minWidth: '160px', padding: '0.75rem 1.5rem', fontSize: '0.9rem'}}>
                        {loading ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorFormPage;
