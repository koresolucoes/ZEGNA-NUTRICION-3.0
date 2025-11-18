
import React, { FC, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ClinicalReference, ConsultationWithLabs, Person, ClinicalReferenceContentItem } from '../../types';

interface ClinicalReferenceDetailModalProps {
    reference: ClinicalReference;
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ClinicalReferenceDetailModal: FC<ClinicalReferenceDetailModalProps> = ({ reference, selectedPerson, lastConsultation, onClose }) => {
    if (!modalRoot) return null;

    const getPatientValue = useCallback((item: ClinicalReferenceContentItem) => {
        if (!lastConsultation || !item.key) return { value: null, isOutOfRange: false };

        let patientValue: number | string | null = null;
        
        if (item.key === 'bp' && lastConsultation.ta) {
            const parts = lastConsultation.ta.split('/');
            if (parts.length === 2) {
                const systolic = parseInt(parts[0], 10);
                const diastolic = parseInt(parts[1], 10);
                if (!isNaN(systolic) && !isNaN(diastolic)) {
                    patientValue = `${systolic}/${diastolic}`;
                    const threshold = item.threshold as number[];
                    const isOutOfRange = threshold && (systolic >= threshold[0] || diastolic >= threshold[1]);
                    return { value: patientValue, isOutOfRange };
                }
            }
        } else if (lastConsultation.lab_results?.[0] && item.key in lastConsultation.lab_results[0]) {
            // Safe access with type assertion or keyof check
             const labResults = lastConsultation.lab_results[0] as any;
             patientValue = labResults[item.key];
        } else if (item.key in lastConsultation) {
            const val = (lastConsultation as any)[item.key];
            if (typeof val === 'string' || typeof val === 'number') {
                patientValue = val;
            }
        }

        if (patientValue === null || patientValue === undefined) return { value: null, isOutOfRange: false };

        const numericValue = typeof patientValue === 'string' ? parseFloat(patientValue) : patientValue as number;
        let isOutOfRange = false;
        if (item.check && typeof item.threshold === 'number' && !isNaN(numericValue)) {
            if (item.check === 'high' && numericValue >= item.threshold) isOutOfRange = true;
            if (item.check === 'low' && numericValue < item.threshold) isOutOfRange = true;
        }

        return { value: patientValue, isOutOfRange };
    }, [lastConsultation]);
    
    const contentArray = Array.isArray(reference.content) ? reference.content : [];

    const modalContent = (
         <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        {reference.icon_svg && <span style={{ color: 'var(--primary-color)' }} dangerouslySetInnerHTML={{ __html: reference.icon_svg }} />}
                        <div>
                             <h2 style={{...styles.modalTitle, margin: 0}}>{reference.title}</h2>
                             {reference.source && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Fuente: {reference.source}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {contentArray.map((item, index) => {
                            const patientData = getPatientValue(item);
                            return (
                                <li key={index} style={{ padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 500 }}>{item.label}</span>
                                        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-color)' }}>{item.value}</span>
                                    </div>
                                    {selectedPerson && patientData.value !== null && (
                                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)'}}>Dato del Paciente: </span>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: patientData.isOutOfRange ? 'var(--error-color)' : 'var(--primary-color)',
                                                fontSize: '1.1rem',
                                                marginLeft: '0.5rem'
                                            }}>
                                                {patientData.value} {patientData.isOutOfRange && '⚠️'}
                                            </span>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default ClinicalReferenceDetailModal;
