import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';
import { Person, ConsultationWithLabs, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, NutritionistProfile, Clinic } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import MedicalReportDocument from './pdf/MedicalReportDocument';

interface ReportModalProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    lifestyleHabits: LifestyleHabits | null;
    isMobile: boolean;
    onClose: () => void;
    nutritionistProfile: NutritionistProfile | null;
    clinic: Clinic | null;
    zIndex?: number;
}

const modalRoot = document.getElementById('modal-root');

const ReportModal: FC<ReportModalProps> = ({ person, consultations, onClose, nutritionistProfile, clinic, zIndex = 1200 }) => {
    const [view, setView] = useState<'config' | 'preview'>('config');
    const [options, setOptions] = useState({
        page1_results: true,
        page2_charts: true,
        page3_tables: true,
        page4_welcome: true,
    });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const { filteredConsultations } = useMemo(() => {
        const start = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;

        if (!start && !end) return { filteredConsultations: consultations };

        const fConsultations = consultations.filter(c => {
            const date = new Date(c.consultation_date);
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        });
        
        return { filteredConsultations: fConsultations };
    }, [dateRange, consultations]);

    const reportData = useMemo(() => {
        const sortedConsults = [...filteredConsultations].sort((a, b) => new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime());
        const current = sortedConsults[0];
        const previous = sortedConsults[1];
        const initial = sortedConsults[sortedConsults.length - 1];

        const pesoActual = current?.weight_kg;
        const pesoInicial = initial?.weight_kg;
        const perdidaPeso = (pesoInicial && pesoActual) ? (((pesoInicial - pesoActual) / pesoInicial) * 100) : null;

        return {
            pesoActual,
            pesoInicial,
            imcActual: current?.imc,
            imcAnterior: previous?.imc,
            perdidaPeso: perdidaPeso ? `${perdidaPeso.toFixed(0)}%` : null,
            colesterolActual: current?.lab_results?.[0]?.cholesterol_mg_dl,
            colesterolInicial: initial?.lab_results?.[0]?.cholesterol_mg_dl,
            trigliceridosActual: current?.lab_results?.[0]?.triglycerides_mg_dl,
            trigliceridosAnterior: previous?.lab_results?.[0]?.triglycerides_mg_dl,
            objetivoSalud: person.health_goal,
            glucosaCapilar: current?.lab_results?.[0]?.glucose_mg_dl,
            hba1c: current?.lab_results?.[0]?.hba1c,
            talla: current?.height_cm || initial?.height_cm,
        };
    }, [filteredConsultations, person.health_goal]);

    // Construct the document component
    const MyDocument = (
        <MedicalReportDocument 
            person={person}
            nutritionistProfile={nutritionistProfile}
            clinic={clinic}
            consultations={filteredConsultations}
            reportData={reportData}
            options={options}
        />
    );

    const renderConfigView = () => (
        <>
            <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Configurar Reporte PDF</h2>
                <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
            </div>
            <div style={styles.modalBody}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>Secciones a Incluir</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                     {Object.entries({
                        page1_results: "Resumen Clínico",
                        page2_charts: "Historial y Tablas",
                        page4_welcome: "Mensaje de Cierre"
                    }).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                            <input type="checkbox" id={key} name={key} checked={options[key as keyof typeof options]} onChange={handleOptionChange} />
                            <label htmlFor={key} style={{marginBottom: 0, cursor: 'pointer'}}>{label}</label>
                        </div>
                    ))}
                </div>

                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>Rango de Fechas</h3>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label>Desde</label>
                        <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} style={{width: '100%', padding: '0.5rem'}} />
                    </div>
                    <div style={{flex: 1}}>
                        <label>Hasta</label>
                        <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} style={{width: '100%', padding: '0.5rem'}} />
                    </div>
                </div>
            </div>
            <div style={styles.modalFooter}>
                <button onClick={onClose} className="button-secondary">Cancelar</button>
                
                {/* PDF Generation Button */}
                <PDFDownloadLink document={MyDocument} fileName={`Reporte_${person.full_name.replace(/\s/g, '_')}.pdf`}>
                    {({ loading }) => (
                        <button disabled={loading} className="button-primary" style={{minWidth: '160px'}}>
                            {loading ? 'Generando PDF...' : 'Descargar PDF'}
                        </button>
                    )}
                </PDFDownloadLink>

                <button onClick={() => setView('preview')} className="button-secondary">Ver Vista Previa</button>
            </div>
        </>
    );

    const renderPreviewView = () => (
        <>
            <div style={{...styles.modalHeader, borderBottom: 'none'}}>
                <h2 style={styles.modalTitle}>Vista Previa</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                     <button onClick={() => setView('config')} className="button-secondary">Volver</button>
                     <PDFDownloadLink document={MyDocument} fileName={`Reporte_${person.full_name}.pdf`}>
                        {({ loading }) => (
                            <button disabled={loading} className="button-primary">
                                {loading ? '...' : ICONS.download}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#525659', display: 'flex', justifyContent: 'center' }}>
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={true}>
                    {MyDocument}
                </PDFViewer>
            </div>
        </>
    );

    return createPortal(
        <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '900px', height: '90vh', padding: 0, display: 'flex', flexDirection: 'column'}} className="fade-in">
                {view === 'config' ? renderConfigView() : renderPreviewView()}
            </div>
        </div>,
        modalRoot
    );
};

export default ReportModal;