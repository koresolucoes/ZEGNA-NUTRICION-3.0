import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, Clinic, NutritionistProfile, Medication } from '../../types';
import PatientSummaryDocument from './pdf/PatientSummaryDocument';

interface PatientSummaryModalProps {
    person: Person;
    clinic: Clinic | null;
    nutritionistProfile: NutritionistProfile | null;
    metrics: { weight?: number; height?: number; imc?: string; };
    prescriptions: Medication[];
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const PatientSummaryModal: FC<PatientSummaryModalProps> = ({
    person, clinic, nutritionistProfile, metrics, prescriptions, onClose
}) => {
    const [recommendations, setRecommendations] = useState('');
    const [nextAppointment, setNextAppointment] = useState('');
    const [view, setView] = useState<'config' | 'preview'>('config');

    const modalContent = (
        <div style={{...styles.modalOverlay, zIndex: 1300}}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                    <h2 style={{margin: 0, fontSize: '1.5rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        {ICONS.file} Resumen para el Paciente
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>

                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                    <button 
                        onClick={() => setView('config')} 
                        style={{...styles.tabButton, ...(view === 'config' ? styles.activeTab : {})}}>
                        1. Configurar Contenido
                    </button>
                    <button 
                        onClick={() => setView('preview')} 
                        style={{...styles.tabButton, ...(view === 'preview' ? styles.activeTab : {})}}>
                        2. Vista Previa y Descarga
                    </button>
                </div>

                <div style={{flex: 1, overflowY: 'auto', paddingRight: '0.5rem'}}>
                    {view === 'config' ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            <div style={styles.card}>
                                <h3 style={{fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)'}}>Plan de Acción y Recomendaciones</h3>
                                <textarea
                                    value={recommendations}
                                    onChange={(e) => setRecommendations(e.target.value)}
                                    placeholder="Escribe aquí las indicaciones generales, metas o plan de alimentación resumido para el paciente..."
                                    style={{...styles.input, minHeight: '150px', resize: 'vertical'}}
                                />
                            </div>

                            <div style={styles.card}>
                                <h3 style={{fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)'}}>Próxima Cita Sugerida</h3>
                                <input
                                    type="text"
                                    value={nextAppointment}
                                    onChange={(e) => setNextAppointment(e.target.value)}
                                    placeholder="Ej: En 1 mes (15 de Noviembre)"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.card}>
                                <h3 style={{fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)'}}>Medicamentos / Suplementos Incluidos</h3>
                                {prescriptions.length > 0 ? (
                                    <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                                        {prescriptions.map((med, idx) => (
                                            <li key={idx} style={{padding: '0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid var(--border-color)'}}>
                                                <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{color: 'var(--text-light)', fontStyle: 'italic', margin: 0}}>No hay medicamentos o suplementos registrados en esta consulta.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{height: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden'}}>
                            <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                                <PatientSummaryDocument 
                                    person={person}
                                    clinic={clinic}
                                    nutritionistProfile={nutritionistProfile}
                                    metrics={metrics}
                                    prescriptions={prescriptions}
                                    recommendations={recommendations}
                                    nextAppointment={nextAppointment}
                                />
                            </PDFViewer>
                        </div>
                    )}
                </div>

                <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                    <button onClick={onClose} className="button-secondary">Cancelar</button>
                    {view === 'config' ? (
                        <button onClick={() => setView('preview')} className="button-primary">Siguiente: Vista Previa</button>
                    ) : (
                        <PDFDownloadLink
                            document={<PatientSummaryDocument person={person} clinic={clinic} nutritionistProfile={nutritionistProfile} metrics={metrics} prescriptions={prescriptions} recommendations={recommendations} nextAppointment={nextAppointment} />}
                            fileName={`Resumen_Consulta_${person.first_name}_${person.last_name}.pdf`}
                            style={{ textDecoration: 'none' }}
                        >
                            {({ loading }) => (
                                <button className="button-primary" disabled={loading} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    {loading ? 'Generando PDF...' : <>{ICONS.download} Descargar PDF</>}
                                </button>
                            )}
                        </PDFDownloadLink>
                    )}
                </div>
            </div>
        </div>
    );

    return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default PatientSummaryModal;
