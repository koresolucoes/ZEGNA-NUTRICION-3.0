
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase, Database } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import { PatientServicePlan, PopulatedReferral } from '../types';

interface AfiliadoFormPageProps {
    afiliadoToEditId: string | null;
    onBack: () => void;
    referralData?: PopulatedReferral | null;
}

const AfiliadoFormPage: FC<AfiliadoFormPageProps> = ({ afiliadoToEditId, onBack, referralData }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        folio: '',
        subscription_start_date: null as string | null,
        subscription_end_date: null as string | null,
        current_plan_id: null as string | null,
        health_goal: '',
        notes: '',
        gender: 'female' as 'female' | 'male',
        birth_date: '',
        curp: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        family_history: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);

    useEffect(() => {
        const fetchAfiliado = async () => {
            if (!afiliadoToEditId) return;
            setLoading(true);
            const { data, error } = await supabase.from('persons').select('*').eq('id', afiliadoToEditId).single();
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
                    notes: data.notes || '',
                    gender: data.gender === 'male' ? 'male' : 'female',
                    birth_date: data.birth_date || '',
                    curp: data.curp || '',
                    address: data.address || '',
                    emergency_contact_name: data.emergency_contact_name || '',
                    emergency_contact_phone: data.emergency_contact_phone || '',
                    family_history: data.family_history || '',
                });
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
            fetchAfiliado();
        }
    }, [afiliadoToEditId, referralData]);
    
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

    const handleSetSubscriptionDuration = (value: number, unit: 'month' | 'year' | null) => {
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
            current_plan_id: null // Manual duration, not a specific plan
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
        if (!formData.full_name) { setError("El nombre del afiliado es obligatorio."); return; }
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
            notes: formData.notes || null,
            normalized_name: normalizedName,
            gender: formData.gender,
            birth_date: formData.birth_date || null,
            curp: formData.curp || null,
            address: formData.address || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            family_history: formData.family_history || null,
        };

        try {
            // Step 1: Insert or Update person data
            if (afiliadoToEditId) {
                const { error: dbError } = await supabase.from('persons').update(payload).eq('id', afiliadoToEditId);
                if (dbError) throw dbError;
            } else {
                const dataToInsert: Database['public']['Tables']['persons']['Insert'] = { 
                    ...payload, 
                    person_type: 'member',
                    clinic_id: clinic.id,
                    created_by_user_id: session.user.id
                };
                const { error: dbError } = await supabase.from('persons').insert(dataToInsert);
                if (dbError) throw dbError;
            }

            // Step 2: If this came from a referral, update the referral status
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

    const sectionHeaderStyle: React.CSSProperties = { color: 'var(--primary-color)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2rem' };
    const pageTitle = afiliadoToEditId ? 'Editar Afiliado' : referralData ? 'Aceptar Referido y Crear Afiliado' : 'Agregar Afiliado';

    const getInitials = (name: string) => {
        return name ? name.trim().charAt(0).toUpperCase() : '?';
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '7rem' }}>
            <div style={styles.pageHeader}>
                <h1>{pageTitle}</h1>
                <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
            </div>
            {referralData && (
                 <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', border: `1px solid var(--primary-color)`, borderRadius: '8px', marginBottom: '1.5rem'}}>
                    <p style={{margin: 0}}><strong>Referido por:</strong> {referralData.sending_ally?.full_name || referralData.sending_clinic?.name || 'Fuente Externa'}</p>
                    <p style={{margin: '0.25rem 0 0 0'}}><strong>Motivo:</strong> {referralData.notes}</p>
                 </div>
            )}
            <form id="afiliado-form" onSubmit={handleSubmit} style={{maxWidth: '700px'}}>
                {error && <p style={styles.error}>{error}</p>}

                 <h3 style={sectionHeaderStyle}>Datos Personales</h3>
                <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface-color) 100%)',
                        color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '2rem', flexShrink: 0,
                        border: '1px solid var(--primary-light)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }}>
                        {getInitials(formData.full_name)}
                    </div>
                    <div style={{flex: 1}}>
                        <label htmlFor="full_name">Nombre del Afiliado *</label>
                        <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required />
                    </div>
                </div>
                
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 2}}>
                       <label htmlFor="phone_number">Teléfono</label>
                       <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} placeholder="Se requieren al menos 4 dígitos"/>
                    </div>
                    <div style={{flex: 1}}>
                       <label htmlFor="birth_date">Fecha de Nacimiento</label>
                       <input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
                    </div>
                     <div style={{flex: 1}}>
                       <label htmlFor="gender">Género</label>
                       <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                            <option value="female">Mujer</option>
                            <option value="male">Hombre</option>
                       </select>
                    </div>
                </div>
                
                 <h3 style={sectionHeaderStyle}>Identificación y Contacto (NOM-004)</h3>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label htmlFor="curp">CURP</label>
                        <input id="curp" name="curp" type="text" value={formData.curp} onChange={handleChange} />
                    </div>
                    <div style={{flex: 1}}>
                        <label htmlFor="folio">Folio (Generado)</label>
                        <input id="folio" name="folio" type="text" value={formData.folio || ''} readOnly style={{ backgroundColor: 'var(--background-color)', cursor: 'not-allowed' }} />
                    </div>
                </div>
                <label htmlFor="address">Domicilio</label>
                <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={2} />
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label>Contacto de Emergencia</label>
                        <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Nombre"/>
                    </div>
                     <div style={{flex: 1}}>
                        <label>Teléfono de Emergencia</label>
                        <input name="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="Teléfono"/>
                    </div>
                </div>

                <h3 style={sectionHeaderStyle}>Historial Clínico</h3>
                <label htmlFor="health_goal">Objetivo de Salud</label>
                <input id="health_goal" name="health_goal" type="text" value={formData.health_goal} onChange={handleChange} placeholder="Ej: Acondicionamiento físico, acceso a funciones..." />
                <label htmlFor="family_history">Antecedentes Heredo-familiares</label>
                <textarea id="family_history" name="family_history" value={formData.family_history} onChange={handleChange} rows={3} placeholder="Enfermedades crónicas en familiares directos (diabetes, hipertensión, etc.)" />

                <h3 style={sectionHeaderStyle}>Suscripción</h3>
                <label htmlFor="service_plan">Asignar Plan de Servicio (opcional)</label>
                <select id="service_plan" value={formData.current_plan_id || ''} onChange={handlePlanSelection} style={{marginBottom: '0.5rem'}}>
                    <option value="">-- Seleccionar para autocompletar fecha --</option>
                    {servicePlans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name} ({plan.duration_days} días)</option>
                    ))}
                </select>

                <label htmlFor="subscription_end_date">Suscripción Válida Hasta</label>
                <input id="subscription_end_date" name="subscription_end_date" type="date" value={formData.subscription_end_date || ''} onChange={handleChange} style={{marginBottom: '0.5rem'}}/>
                <div style={styles.planDurationButtons}>
                    <button type="button" className="button-secondary" onClick={() => handleSetSubscriptionDuration(1, 'month')}>+1 mes</button>
                    <button type="button" className="button-secondary" onClick={() => handleSetSubscriptionDuration(3, 'month')}>+3 meses</button>
                    <button type="button" className="button-secondary" onClick={() => handleSetSubscriptionDuration(1, 'year')}>+1 año</button>
                    <button type="button" className="button-secondary" onClick={() => handleSetSubscriptionDuration(0, null)}>Sin Suscripción</button>
                </div>

                 <h3 style={sectionHeaderStyle}>Notas Adicionales</h3>
                <label htmlFor="notes">Notas</label>
                <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Notas adicionales sobre el afiliado..."></textarea>
            </form>
            <div style={styles.floatingActions}>
                <button type="button" onClick={onBack} className="button-secondary">Cancelar</button>
                <button type="submit" form="afiliado-form" disabled={loading} style={styles.floatingSaveButton} aria-label={afiliadoToEditId ? 'Guardar Cambios' : 'Guardar Afiliado'}>
                    {loading ? '...' : ICONS.save}
                </button>
            </div>
        </div>
    );
};

export default AfiliadoFormPage;
