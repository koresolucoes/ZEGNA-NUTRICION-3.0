
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase, Database } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import { PatientServicePlan, PopulatedReferral } from '../types';

interface ClientFormPageProps {
    clientToEditId: string | null;
    onBack: () => void;
    referralData?: PopulatedReferral | null;
}

const ClientFormPage: FC<ClientFormPageProps> = ({ clientToEditId, onBack, referralData }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        folio: '',
        subscription_start_date: null as string | null,
        subscription_end_date: null as string | null,
        current_plan_id: null as string | null,
        health_goal: '',
        birth_date: '',
        gender: 'female' as 'female' | 'male',
        avatar_url: '',
        curp: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        family_history: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);

    useEffect(() => {
        const fetchPerson = async () => {
            if (!clientToEditId) return;
            setLoading(true);
            const { data, error } = await supabase.from('persons').select('*').eq('id', clientToEditId).single();
            
            if (error && error.code !== 'PGRST116') {
                setError(error.message);
            } else if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    phone_number: data.phone_number || '',
                    folio: data.folio || '',
                    subscription_start_date: data.subscription_start_date || null,
                    subscription_end_date: data.subscription_end_date || null,
                    current_plan_id: data.current_plan_id || null,
                    health_goal: data.health_goal || '',
                    birth_date: data.birth_date || '',
                    gender: data.gender === 'male' ? 'male' : 'female',
                    avatar_url: data.avatar_url || '',
                    curp: data.curp || '',
                    address: data.address || '',
                    emergency_contact_name: data.emergency_contact_name || '',
                    emergency_contact_phone: data.emergency_contact_phone || '',
                    family_history: data.family_history || '',
                });
                setAvatarPreview(data.avatar_url || null);
            }
            setLoading(false);
        };
        
        if (referralData) {
            const patientInfo = referralData.patient_info as any;
            setFormData(prev => ({
                ...prev,
                full_name: patientInfo.name || '',
                phone_number: patientInfo.phone || '',
                health_goal: referralData.notes || '',
            }));
        } else {
            fetchPerson();
        }
    }, [clientToEditId, referralData]);

    useEffect(() => {
        const fetchServicePlans = async () => {
            if (!clinic) return;
            const { data, error } = await supabase
                .from('patient_service_plans')
                .select('*')
                .eq('clinic_id', clinic.id)
                .eq('is_active', true)
                .order('name');
            if (error) console.error('Error fetching service plans', error);
            else setServicePlans(data || []);
        };
        fetchServicePlans();
    }, [clinic]);

    useEffect(() => {
        const name = formData.full_name.trim();
        const phoneDigits = (formData.phone_number || '').replace(/\D/g, '');
        
        let newFolio = '';
        if (name && phoneDigits.length >= 4) {
            const initials = name
                .split(/\s+/)
                .filter(Boolean)
                .map(word => word[0])
                .join('')
                .toUpperCase();
            
            const lastFourDigits = phoneDigits.slice(-4);
            newFolio = `${initials}-${lastFourDigits}`;
        }

        if (newFolio !== formData.folio) {
            setFormData(prev => ({ ...prev, folio: newFolio }));
        }
    }, [formData.full_name, formData.phone_number, formData.folio]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSetPlanDuration = (value: number, unit: 'month' | 'year' | null) => {
        if (unit === null) {
            setFormData(prev => ({ ...prev, subscription_end_date: null, subscription_start_date: null, current_plan_id: null }));
            return;
        }
        const newStartDate = new Date();
        const newEndDate = new Date(newStartDate);
        if (unit === 'month') {
            newEndDate.setMonth(newEndDate.getMonth() + value);
        } else if (unit === 'year') {
            newEndDate.setFullYear(newEndDate.getFullYear() + value);
        }
        setFormData(prev => ({ 
            ...prev, 
            subscription_start_date: newStartDate.toISOString().split('T')[0],
            subscription_end_date: newEndDate.toISOString().split('T')[0],
            current_plan_id: null 
        }));
    };

    const handlePlanSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const planId = e.target.value;
        const plan = servicePlans.find(p => p.id === planId);
        
        if (plan) {
            const newStartDate = new Date();
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + plan.duration_days);
            setFormData(prev => ({ 
                ...prev, 
                subscription_start_date: newStartDate.toISOString().split('T')[0],
                subscription_end_date: newEndDate.toISOString().split('T')[0],
                current_plan_id: plan.id
            }));
        } else {
            setFormData(prev => ({...prev, current_plan_id: null}));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) { setError("No se pudo identificar la clínica. Intenta refrescar la página."); return; }
        if (!formData.full_name) { setError("El nombre del paciente es obligatorio."); return; }
        setLoading(true);
        setError(null);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setError("No hay un usuario autenticado.");
            setLoading(false);
            return;
        }

        const name = formData.full_name.trim();
        let normalizedName: string | null = null;
        if (name) {
            const firstName = name.split(' ')[0];
            normalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }

        const payload = {
            full_name: formData.full_name,
            phone_number: formData.phone_number || null,
            folio: formData.folio || null,
            subscription_start_date: formData.subscription_start_date || null,
            subscription_end_date: formData.subscription_end_date || null,
            current_plan_id: formData.current_plan_id || null,
            health_goal: formData.health_goal || null,
            normalized_name: normalizedName,
            birth_date: formData.birth_date || null,
            gender: formData.gender,
            curp: formData.curp || null,
            address: formData.address || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            family_history: formData.family_history || null,
        };

        try {
            let personId = clientToEditId;
            if (clientToEditId) {
                const { error: dbError } = await supabase.from('persons').update(payload).eq('id', clientToEditId);
                if (dbError) throw dbError;
            } else {
                const dataToInsert: Database['public']['Tables']['persons']['Insert'] = { 
                    ...payload, 
                    person_type: 'client',
                    clinic_id: clinic.id,
                    created_by_user_id: session.user.id
                };
                const { data: newPerson, error: dbError } = await supabase.from('persons').insert(dataToInsert).select('id').single();
                if (dbError) throw dbError;
                if (!newPerson) throw new Error("Fallo al crear el paciente.");
                personId = newPerson.id;
            }

            if (!personId) throw new Error("ID de paciente no disponible para subir avatar.");

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `patient-avatars/${personId}/avatar.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                const newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

                const { error: avatarUpdateError } = await supabase
                    .from('persons')
                    .update({ avatar_url: newAvatarUrl })
                    .eq('id', personId);
                
                if (avatarUpdateError) throw avatarUpdateError;
            }

            await supabase.from('logs').insert({
                person_id: personId,
                log_type: 'AUDITORÍA',
                description: `Se ${clientToEditId ? 'actualizó' : 'creó'} el expediente del paciente.`,
                created_by_user_id: session.user.id,
            });

            if (referralData?.id) {
                const { error: rpcError } = await supabase.rpc('update_referral_status', {
                    p_referral_id: referralData.id,
                    p_new_status: 'accepted',
                    p_clinic_id: clinic.id
                });
                if (rpcError) throw rpcError;
            }

            onBack();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sectionHeaderStyle: React.CSSProperties = { 
        color: 'var(--primary-color)', 
        fontSize: '1rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.5rem', 
        marginBottom: '1.5rem', 
        marginTop: '2rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
    };

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // High elevation shadow
        width: '100%',
        maxWidth: '850px',
        margin: '2rem auto',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle: React.CSSProperties = {
        padding: '1.5rem 2rem',
        backgroundColor: 'var(--surface-hover-color)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const footerStyle: React.CSSProperties = {
        padding: '1.5rem 2rem',
        backgroundColor: 'var(--surface-hover-color)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem'
    };

    return (
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: '1rem' }}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>
                            {clientToEditId ? 'Editar Expediente' : 'Nuevo Paciente'}
                        </h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                            {clientToEditId ? 'Actualiza la información del paciente' : 'Registra un nuevo paciente en la clínica'}
                        </p>
                    </div>
                    <button onClick={onBack} style={{ ...styles.iconButton, width: '32px', height: '32px' }}>
                        {ICONS.close}
                    </button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                    {referralData && (
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-dark)', border: `1px solid var(--primary-color)`, borderRadius: '8px', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{fontSize: '1.2rem'}}>📩</span>
                                <span style={{fontWeight: 600}}>Referido Entrante</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>De:</strong> {referralData.sending_ally?.full_name || 'Colaborador'}</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}><strong>Nota:</strong> "{referralData.notes}"</p>
                        </div>
                    )}

                    <form id="client-form" onSubmit={handleSubmit}>
                        {error && <p style={styles.error}>{error}</p>}

                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
                             <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                                <img
                                    src={avatarPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.full_name || '?'}&radius=50`}
                                    alt="Avatar"
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-hover-color)' }}
                                />
                                <label htmlFor="avatar" style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--primary-color)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                    {ICONS.edit}
                                </label>
                                <input id="avatar" name="avatar" type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="full_name">Nombre Completo *</label>
                                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required style={{ fontSize: '1.1rem', fontWeight: 500 }} placeholder="Ej. Juan Pérez" />
                            </div>
                        </div>

                        <h3 style={sectionHeaderStyle}>Información Personal</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label htmlFor="birth_date">Fecha de Nacimiento</label>
                                <input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="gender">Género</label>
                                <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="female">Mujer</option>
                                    <option value="male">Hombre</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="phone_number">Teléfono</label>
                                <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} placeholder="55 1234 5678" />
                            </div>
                        </div>

                        <h3 style={sectionHeaderStyle}>Identificación y Contacto</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label htmlFor="curp">CURP</label>
                                <input id="curp" name="curp" type="text" value={formData.curp} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="folio">Folio Interno</label>
                                <input id="folio" name="folio" type="text" value={formData.folio || ''} readOnly style={{ backgroundColor: 'var(--surface-hover-color)', cursor: 'not-allowed', color: 'var(--text-light)' }} />
                            </div>
                        </div>
                        
                        <label htmlFor="address">Domicilio</label>
                        <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="Calle, Número, Colonia..." />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <div>
                                <label>Contacto de Emergencia</label>
                                <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Nombre del contacto" />
                            </div>
                            <div>
                                <label>Teléfono de Emergencia</label>
                                <input name="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="Teléfono del contacto" />
                            </div>
                        </div>

                        <h3 style={sectionHeaderStyle}>Perfil Clínico</h3>
                        <label htmlFor="health_goal">Objetivo de Salud Principal</label>
                        <input id="health_goal" name="health_goal" type="text" value={formData.health_goal} onChange={handleChange} placeholder="Ej: Control de peso, mejora de rendimiento..." />
                        
                        <label htmlFor="family_history">Antecedentes Heredo-familiares</label>
                        <textarea id="family_history" name="family_history" value={formData.family_history} onChange={handleChange} rows={3} placeholder="Diabetes, Hipertensión, etc. en familiares directos." />

                        <h3 style={sectionHeaderStyle}>Suscripción y Plan</h3>
                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                            <label htmlFor="service_plan">Asignar Plan (Opcional)</label>
                            <select id="service_plan" value={formData.current_plan_id || ''} onChange={handlePlanSelection} style={{ marginBottom: '1rem' }}>
                                <option value="">-- Seleccionar Plan --</option>
                                {servicePlans.map(plan => (
                                    <option key={plan.id} value={plan.id}>{plan.name} ({plan.duration_days} días)</option>
                                ))}
                            </select>

                            <label htmlFor="subscription_end_date">Válido Hasta</label>
                            <input id="subscription_end_date" name="subscription_end_date" type="date" value={formData.subscription_end_date || ''} onChange={handleChange} style={{ marginBottom: '1rem' }} />
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button type="button" className="button-secondary" onClick={() => handleSetPlanDuration(1, 'month')} style={{fontSize: '0.8rem', padding: '6px 12px'}}>+1 Mes</button>
                                <button type="button" className="button-secondary" onClick={() => handleSetPlanDuration(3, 'month')} style={{fontSize: '0.8rem', padding: '6px 12px'}}>+3 Meses</button>
                                <button type="button" className="button-secondary" onClick={() => handleSetPlanDuration(1, 'year')} style={{fontSize: '0.8rem', padding: '6px 12px'}}>+1 Año</button>
                                <button type="button" className="button-secondary" onClick={() => handleSetPlanDuration(0, null)} style={{fontSize: '0.8rem', padding: '6px 12px', color: 'var(--error-color)', borderColor: 'var(--error-color)'}}>Sin Plan</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div style={footerStyle}>
                    <button type="button" onClick={onBack} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" form="client-form" disabled={loading} style={{ minWidth: '150px' }}>
                        {loading ? 'Guardando...' : 'Guardar Paciente'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientFormPage;
