import React, { FC, useRef } from 'react';
import { Person, PatientServicePlan } from '../../../types';
import { styles } from '../../../constants';
import PlanStatusIndicator from '../../shared/PlanStatusIndicator';
import { ICONS } from '../../../pages/AuthPage';

interface InfoTabProps {
    person: Person;
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
    person, servicePlans,
    onRegisterConsent, onRevokeConsent, onExportData, onUploadConsent, isUploadingConsent, openModal, onManagePlan
}) => {
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

    const InfoBlock: FC<{title: string, value: React.ReactNode}> = ({ title, value }) => (
        <div>
            <p style={{...styles.detailGroupTitle, textTransform: 'uppercase'}}>{title}</p>
            <p style={{margin: 0, fontSize: '1rem', color: 'var(--text-color)'}}>{value || '-'}</p>
        </div>
    );

    return (
        <div className="fade-in">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"/>
            
            <section style={{marginBottom: '2rem'}}>
                <div className="section-header">
                     <h2 className="section-title">Información Personal</h2>
                </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem 2rem' }}>
                    <InfoBlock title="Nombre Completo" value={person.full_name} />
                    <InfoBlock title="Fecha de Nacimiento" value={person.birth_date ? new Date(person.birth_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'} />
                    <InfoBlock title="Edad" value={calculateAge(person.birth_date)} />
                    <InfoBlock title="Género" value={person.gender === 'male' ? 'Hombre' : person.gender === 'female' ? 'Mujer' : 'No definido'} />
                    <InfoBlock title="Teléfono" value={person.phone_number} />
                    <InfoBlock title="Domicilio" value={person.address} />
                    <InfoBlock title="CURP" value={person.curp} />
                    <InfoBlock title="Folio" value={person.folio} />
                </div>
            </section>
            
            <section style={{marginBottom: '2rem'}}>
                <div className="section-header">
                     <h2 className="section-title">Contacto de Emergencia</h2>
                </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 2rem' }}>
                    <InfoBlock title="Nombre" value={person.emergency_contact_name} />
                    <InfoBlock title="Teléfono" value={person.emergency_contact_phone} />
                 </div>
            </section>
            
            <section style={{marginBottom: '2rem'}}>
                <div className="section-header">
                    <h2 className="section-title">Suscripción</h2>
                     <button onClick={onManagePlan} className="button-secondary">Gestionar Plan</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem 2rem' }}>
                    <InfoBlock title="Plan Actual" value={currentPlan?.name || 'Sin plan asignado'} />
                    <InfoBlock title="Estado" value={<PlanStatusIndicator planEndDate={person.subscription_end_date} />} />
                </div>
            </section>

            <section>
                <div className="section-header">
                    <h2 className="section-title">Cumplimiento Legal (NOM-004 y LFPDPPP)</h2>
                </div>
                <div style={{backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', padding: '1.5rem'}}>
                    <div style={styles.detailGroup}>
                        <h4 style={styles.detailGroupTitle}>Consentimiento Informado</h4>
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
                            <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px'}}>
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
                        <h4 style={styles.detailGroupTitle}>Acciones de Derechos ARCO</h4>
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start'}}>
                            <button onClick={onExportData} className="button-secondary">Exportar Expediente (JSON)</button>
                            <button onClick={onRevokeConsent} className="button-danger">Revocar Consentimiento y Eliminar Datos</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};