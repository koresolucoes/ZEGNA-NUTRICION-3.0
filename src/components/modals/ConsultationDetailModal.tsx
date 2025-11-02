import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ConsultationWithLabs } from '../../types';

interface ConsultationDetailModalProps {
    consultation: ConsultationWithLabs;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ConsultationDetailModal: FC<ConsultationDetailModalProps> = ({ consultation, onClose }) => {
    if (!modalRoot) return null;

    const labResults = consultation.lab_results;

    const modalContent = (
         <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        Detalles de la Consulta
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <h3 style={{...styles.detailCardTitle, color: 'var(--primary-dark)'}}>
                        {new Date(consultation.consultation_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h3>

                    <div style={{...styles.detailGroup, marginTop: '1.5rem'}}>
                        <h4 style={styles.detailGroupTitle}>Mediciones</h4>
                        <p style={{margin: 0}}><strong>Peso:</strong> {consultation.weight_kg ?? '-'} kg</p>
                        <p style={{margin: 0}}><strong>Altura:</strong> {consultation.height_cm ?? '-'} cm</p>
                        <p style={{margin: 0}}><strong>IMC:</strong> {consultation.imc ?? '-'}</p>
                        <p style={{margin: 0}}><strong>TA:</strong> {consultation.ta ?? '-'}</p>
                    </div>

                     {consultation.notes && (
                        <div style={styles.detailGroup}>
                            <h4 style={styles.detailGroupTitle}>Notas de la Consulta</h4>
                            <p style={{margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{consultation.notes}</p>
                        </div>
                    )}
                    
                    {labResults && labResults.length > 0 && (
                        <div style={styles.detailGroup}>
                            <h4 style={styles.detailGroupTitle}>Resultados de Laboratorio</h4>
                            <p style={{margin: 0}}><strong>Glucosa:</strong> {labResults[0].glucose_mg_dl ?? '-'} mg/dl</p>
                            <p style={{margin: 0}}><strong>HbA1c:</strong> {labResults[0].hba1c ?? '-'}%</p>
                            <p style={{margin: 0}}><strong>Colesterol:</strong> {labResults[0].cholesterol_mg_dl ?? '-'} mg/dl</p>
                            <p style={{margin: 0}}><strong>Triglicéridos:</strong> {labResults[0].triglycerides_mg_dl ?? '-'} mg/dl</p>
                        </div>
                    )}

                </div>
                 <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default ConsultationDetailModal;
