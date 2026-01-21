
import React, { FC, useRef } from 'react';
import { Person, ConsultationWithLabs, Allergy, MedicalHistory, PatientServicePlan } from '../../../types';
import { styles } from '../../../constants';
import PlanStatusIndicator from '../../shared/PlanStatusIndicator';
import { ICONS } from '../../../pages/AuthPage';

interface InfoTabProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    servicePlans: PatientServicePlan[];
    onRegisterConsent: () => void;
    onRevokeConsent: () => void;
    onExportData: () => void;
    onUploadConsent: (file: File) => void;
    isUploadingConsent: boolean;
    openModal: (action: 'deleteConsentFile', id: string, text: string, filePath: string) => void;
    onManagePlan: () => void;
}

export const InfoTab: FC<InfoTabProps> = ({ 
    person, consultations, allergies, medicalHistory, servicePlans,
    onRegisterConsent, onRevokeConsent, onExportData, onUploadConsent, isUploadingConsent, openModal, onManagePlan
}) => {
    const latestConsultation = consultations?.[0] || null;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPlan = servicePlans.find(p => p.id === person.current_plan_id);

    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'No definida';
        const birth = new Date(birthDate.replace(/-/g, '/'));
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} años`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUploadConsent(e.target.files[0]);
        }
    };
    
    const handleDeleteFile = () => {
        if (!person.consent_file_url) return;
        try {
            const url = new URL(person.consent_file_url);
            const filePath = decodeURIComponent(url.pathname.split('/files/')[1]);
            openModal('deleteConsentFile', person.id, `¿Estás seguro de que quieres eliminar el documento de consentimiento firmado de ${person.full_name}?`, filePath);
        } catch (error) {
            console.error("Invalid URL for consent file:", person.consent_file_url);
        }
    };

    const InfoCard: FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
        <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                {icon && <span style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>{icon}</span>}
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)' }}>{title}</h3>
            </div>
            {children}
        </div>
    );

    const DataRow: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-color)' }}>{value || '-'}</span>
        </div>
    );

    return (
        <div className="fade-in">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"/>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                
                {/* 1. Identidad y Contacto */}
                <InfoCard title="Identidad y Contacto" icon={ICONS.user}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <DataRow label="Fecha de Nacimiento" value={person.birth_date ? new Date(person.birth_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'} />
                        <DataRow label="Edad" value={calculateAge(person.birth_date)} />
                        <DataRow label="Género" value={person.gender === 'male' ? 'Hombre' : person.gender === 'female' ? 'Mujer' : 'No definido'} />
                        <DataRow label="Teléfono" value={person.phone_number} />
                    </div>
                    <DataRow label="Domicilio" value={person.address} />
                    <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--error-color)'}}>{ICONS.phone}</span>
                            <span style={{fontWeight: 600, fontSize: '0.9rem'}}>Contacto de Emergencia</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>{person.emergency_contact_name || 'No definido'}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>{person.emergency_contact_phone}</p>
                    </div>
                </InfoCard>

                {/* 2. Datos Administrativos */}
                <InfoCard title="Datos Administrativos" icon={ICONS.briefcase}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <DataRow label="Folio Interno" value={<code style={{ backgroundColor: 'var(--surface-hover-color)', padding: '2px 6px', borderRadius: '4px' }}>{person.folio}</code>} />
                        <DataRow label="CURP" value={person.curp} />
                    </div>
                    
                    <div style={{ marginTop: '0.5rem' }}>
                         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                             <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Plan de Servicio</span>
                             <button onClick={onManagePlan} style={{...styles.iconButton, color: 'var(--primary-color)', padding: '4px'}} title="Gestionar">{ICONS.edit}</button>
                         </div>
                         <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{fontWeight: 600, fontSize: '1.1rem'}}>{currentPlan?.name || 'Sin plan asignado'}</span>
                                <PlanStatusIndicator planEndDate={person.subscription_end_date} />
                            </div>
                            {person.subscription_end_date && (
                                <span style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                    Vence el {new Date(person.subscription_end_date.replace(/-/g, '/')).toLocaleDateString('es-MX')}
                                </span>
                            )}
                         </div>
                    </div>
                </InfoCard>
                
                {/* 3. Resumen Clínico */}
                <InfoCard title="Resumen Clínico Inicial" icon={ICONS.activity}>
                     <DataRow label="Objetivo de Salud" value={person.health_goal} />
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <DataRow label="Último Peso" value={latestConsultation?.weight_kg ? `${latestConsultation.weight_kg} kg` : 'N/A'} />
                        <DataRow label="Último IMC" value={latestConsultation?.imc ? latestConsultation.imc : 'N/A'} />
                    </div>
                     <DataRow label="Antecedentes Heredo-familiares" value={<span style={{fontSize: '0.9rem', lineHeight: 1.5}}>{person.family_history}</span>} />
                </InfoCard>

                {/* 4. Cumplimiento y Legal */}
                <InfoCard title="Cumplimiento Normativo (NOM-004)" icon={ICONS.check}>
                    <div>
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Consentimiento Informado</span>
                         <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {person.consent_given_at ? (
                                <span style={{ color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {ICONS.check} Otorgado el {new Date(person.consent_given_at).toLocaleDateString('es-MX')}
                                </span>
                            ) : (
                                <span style={{ color: 'var(--error-color)', fontWeight: 600 }}>Pendiente de firma</span>
                            )}
                         </div>
                    </div>

                    {person.consent_file_url ? (
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <a href={person.consent_file_url} target="_blank" rel="noopener noreferrer" style={{...styles.link, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                {ICONS.file} Ver Documento
                            </a>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingConsent} style={styles.iconButton} title="Reemplazar">{ICONS.edit}</button>
                                <button onClick={handleDeleteFile} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                            {!person.consent_given_at && <button onClick={onRegisterConsent} style={{fontSize: '0.85rem', padding: '0.5rem 1rem'}}>Registrar Firma Digital</button>}
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingConsent} className="button-secondary" style={{fontSize: '0.85rem', padding: '0.5rem 1rem'}}>
                                {isUploadingConsent ? 'Subiendo...' : 'Subir PDF Firmado'}
                            </button>
                        </div>
                    )}
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                         <button onClick={onExportData} className="button-secondary" style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem'}}>
                            {ICONS.download} Exportar Datos (JSON)
                         </button>
                         <button onClick={onRevokeConsent} style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: 'none'}}>
                            Revocar y Eliminar
                         </button>
                    </div>
                </InfoCard>
            </div>
        </div>
    );
};
