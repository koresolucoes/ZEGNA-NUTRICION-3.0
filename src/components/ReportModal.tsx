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

const ReportModal: FC<ReportModalProps> = ({ person, consultations, dietLogs, exerciseLogs, onClose, nutritionistProfile, clinic, zIndex = 1200 }) => {
    const [view, setView] = useState<'config' | 'preview'>('config');
    const [options, setOptions] = useState({
        page1_results: true,
        page2_charts: true,
        page3_tables: true,
        page4_welcome: true,
    });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const toggleOption = (key: keyof typeof options) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
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
            dietLogs={dietLogs}
            exerciseLogs={exerciseLogs}
            reportData={reportData}
            options={options}
        />
    );

    const SelectableCard: FC<{ 
        id: keyof typeof options; 
        label: string; 
        description: string;
        icon: React.ReactNode 
    }> = ({ id, label, description, icon }) => {
        const isSelected = options[id];
        return (
            <div 
                onClick={() => toggleOption(id)}
                className="nav-item-hover"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--surface-color)' : 'var(--surface-hover-color)',
                    color: isSelected ? 'var(--primary-color)' : 'var(--text-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0
                }}>
                    {icon}
                </div>
                <div style={{flex: 1}}>
                    <h4 style={{margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, color: isSelected ? 'var(--primary-dark)' : 'var(--text-color)'}}>{label}</h4>
                    <p style={{margin: 0, fontSize: '0.8rem', color: isSelected ? 'var(--primary-dark)' : 'var(--text-light)', opacity: 0.8}}>{description}</p>
                </div>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: isSelected ? 'none' : '2px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--primary-color)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '0.9rem'
                }}>
                    {isSelected && '✓'}
                </div>
            </div>
        );
    };

    const inputDateStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-color)',
        color: 'var(--text-color)',
        fontSize: '0.9rem',
        outline: 'none'
    };

    const renderConfigView = () => (
        <>
            <div style={styles.modalHeader}>
                <div>
                    <h2 style={{...styles.modalTitle, fontSize: '1.4rem'}}>Configurar Reporte</h2>
                    <p style={{margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem'}}>Personaliza las secciones y datos del PDF.</p>
                </div>
                <button onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
            </div>
            
            <div style={{...styles.modalBody, paddingRight: '1rem', overflowY: 'auto'}}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', fontWeight: 700 }}>Contenido del Reporte</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <SelectableCard 
                        id="page1_results" 
                        label="Resumen Clínico" 
                        description="Peso, IMC, Talla y últimos resultados de laboratorio." 
                        icon={ICONS.activity} 
                    />
                    <SelectableCard 
                        id="page2_charts" 
                        label="Gráficas de Progreso" 
                        description="Evolución visual de peso e IMC en el tiempo." 
                        icon={ICONS.network} 
                    />
                    <SelectableCard 
                        id="page3_tables" 
                        label="Plan Actual" 
                        description="Detalle del plan de alimentación y rutina de ejercicio." 
                        icon={ICONS.book} 
                    />
                    <SelectableCard 
                        id="page4_welcome" 
                        label="Mensaje de Cierre" 
                        description="Notas finales, firma del nutriólogo y contacto." 
                        icon={ICONS.check} 
                    />
                </div>

                <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>
                        Filtrar Datos Históricos
                    </h3>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
                        <div style={{flex: 1, minWidth: '150px'}}>
                            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)'}}>Desde</label>
                            <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} style={inputDateStyle} />
                        </div>
                        <div style={{flex: 1, minWidth: '150px'}}>
                            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)'}}>Hasta</label>
                            <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} style={inputDateStyle} />
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={styles.modalFooter}>
                <button onClick={onClose} className="button-secondary" style={{padding: '0.75rem 1.5rem'}}>Cancelar</button>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setView('preview')} className="button-secondary" style={{padding: '0.75rem 1.5rem'}}>
                        👁️ Vista Previa
                    </button>
                    <PDFDownloadLink document={MyDocument} fileName={`Reporte_${person.full_name.replace(/\s/g, '_')}.pdf`}>
                        {({ loading }) => (
                            <button disabled={loading} className="button-primary" style={{minWidth: '160px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                {loading ? 'Generando...' : <>{ICONS.download} Descargar PDF</>}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
        </>
    );

    const renderPreviewView = () => (
        <>
            <div style={{...styles.modalHeader, borderBottom: 'none', backgroundColor: '#323639', color: 'white'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => setView('config')} style={{...styles.iconButton, color: 'white', backgroundColor: 'rgba(255,255,255,0.1)'}}>
                        {ICONS.back}
                    </button>
                    <h2 style={{margin: 0, fontSize: '1.2rem'}}>Vista Previa del Documento</h2>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                     <PDFDownloadLink document={MyDocument} fileName={`Reporte_${person.full_name}.pdf`}>
                        {({ loading }) => (
                            <button disabled={loading} className="button-primary" style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>
                                {loading ? '...' : ICONS.download}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#525659', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={true}>
                    {MyDocument}
                </PDFViewer>
            </div>
        </>
    );

    return createPortal(
        <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, width: '95%', maxWidth: '900px', height: '90vh', maxHeight: '800px', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}} className="fade-in">
                {view === 'config' ? renderConfigView() : renderPreviewView()}
            </div>
        </div>,
        modalRoot
    );
};

export default ReportModal;