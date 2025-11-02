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


    return (
        <div style={{...styles.detailCard, marginBottom: '1rem' }} className="fade-in">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"/>
            <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Información de la Persona</h3></div>
            <div style={{...styles.detailCardBody, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem 2rem'}}>
                
                {/* Column 1: Personal & Plan */}
                <div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Fecha de Nacimiento</h4><p style={styles.clinicalDataValue}>{person.birth_date ? new Date(person.birth_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Edad</h4><p style={styles.clinicalDataValue}>{calculateAge(person.birth_date)}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Género</h4><p style={styles.clinicalDataValue}>{person.gender === 'male' ? 'Hombre' : person.gender === 'female' ? 'Mujer' : 'No definido'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Teléfono</h4><p style={styles.clinicalDataValue}>{person.phone_number || '-'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Domicilio</h4><p style={styles.clinicalDataValue}>{person.address || 'No definido'}</p></div>
                </div>

                {/* Column 2: Clinical Summary & IDs */}
                <div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Folio</h4><p style={styles.clinicalDataValue}>{person.folio || '-'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>CURP</h4><p style={styles.clinicalDataValue}>{person.curp || 'No definido'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Último Peso</h4><p style={styles.clinicalDataValue}>{latestConsultation?.weight_kg ? `${latestConsultation.weight_kg} kg` : 'N/A'}</p></div>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Último IMC</h4><p style={styles.clinicalDataValue}>{latestConsultation?.imc ? latestConsultation.imc : 'N/A'}</p></div>
                </div>
                
                {/* Full-width sections */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Objetivo de Salud Principal</h4><p style={{...styles.clinicalDataValue, fontSize: '1rem'}}>{person.health_goal || 'No definido'}</p></div>
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={styles.detailGroup}>
                        <h4 style={styles.detailGroupTitle}>Plan de Servicio</h4>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <p style={{margin: 0, fontWeight: 600}}>{currentPlan?.name || 'Sin plan asignado'}</p>
                                <PlanStatusIndicator planEndDate={person.subscription_end_date} />
                            </div>
                            <button onClick={onManagePlan} className="button-secondary">Gestionar Plan</button>
                        </div>
                    </div>
                </div>
                
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                     <div style={styles.detailGroup}>
                        <h4 style={styles.detailGroupTitle}>Antecedentes Heredo-familiares</h4>
                        <p style={{...styles.clinicalDataValue, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5}}>{person.family_history || 'Sin registrar'}</p>
                    </div>
                </div>
                
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                     <div style={styles.detailGroup}>
                        <h4 style={styles.detailGroupTitle}>Contacto de Emergencia</h4>
                        <p style={styles.clinicalDataValue}>{person.emergency_contact_name || 'No definido'}</p>
                        <p style={{...styles.clinicalDataValue, fontSize: '1rem', color: 'var(--text-light)'}}>{person.emergency_contact_phone || ''}</p>
                    </div>
                </div>

                {/* Compliance Section */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div style={styles.detailGroup}>
                        <h4 style={styles.detailGroupTitle}>Consentimiento Informado (NOM-004)</h4>
                        {person.consent_given_at ? (
                            <p style={{...styles.clinicalDataValue, fontSize: '1rem', color: 'var(--primary-color)'}}>
                                Otorgado el {new Date(person.consent_given_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                        ) : (
                            <p style={{...styles.clinicalDataValue, color: 'var(--error-color)', fontSize: '1rem'}}>
                                Pendiente de registro
                            </p>
                        )}
                        {person.consent_file_url ? (
                            <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                                <p style={{margin: '0 0 0.5rem 0', fontWeight: 500}}>Documento de consentimiento firmado:</p>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'}}>
                                    <a href={person.consent_file_url} target="_blank" rel="noopener noreferrer" className="button-secondary" style={{textDecoration: 'none'}}>
                                        {ICONS.file} Ver Documento
                                    </a>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingConsent} className="button-secondary">{isUploadingConsent ? '...' : 'Reemplazar'}</button>
                                    <button onClick={handleDeleteFile} className="button-danger">Eliminar</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{marginTop: '1rem'}}>
                                {!person.consent_given_at && (
                                    <button onClick={onRegisterConsent}>Registrar Consentimiento</button>
                                )}
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingConsent} className="button-secondary" style={{marginLeft: '1rem'}}>
                                    {isUploadingConsent ? 'Subiendo...' : 'Subir Documento Firmado'}
                                </button>
                            </div>
                        )}
                    </div>
                     <div style={{...styles.detailGroup, marginTop: '1.5rem'}}>
                        <h4 style={styles.detailGroupTitle}>Acciones de Cumplimiento (LFPDPPP)</h4>
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start'}}>
                            <button onClick={onExportData} className="button-secondary">Exportar Expediente (JSON)</button>
                            <button onClick={onRevokeConsent} className="button-danger">Revocar Consentimiento y Eliminar Datos</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
