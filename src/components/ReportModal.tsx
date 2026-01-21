
import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';
import { Person, ConsultationWithLabs, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, NutritionistProfile, Clinic } from '../types';
import ProgressChart from './shared/ProgressChart';
import { useClinic } from '../contexts/ClinicContext';

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

const ReportModal: FC<ReportModalProps> = ({ person, consultations, dietLogs, exerciseLogs, allergies, medicalHistory, medications, lifestyleHabits, isMobile, onClose, nutritionistProfile, clinic, zIndex = 1200 }) => {
    const { subscription } = useClinic();
    const [view, setView] = useState<'config' | 'preview'>('config');
    const [options, setOptions] = useState({
        page1_results: true,
        page2_charts: true,
        page3_tables: true,
        page4_welcome: true,
    });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isDownloading, setIsDownloading] = useState(false);

    const showBranding = useMemo(() => {
        return (subscription?.plans?.features as any)?.branding !== false;
    }, [subscription]);

    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
    
        const element = document.getElementById('printable-area');
        if (!element) {
            alert("Contenido del reporte no encontrado.");
            setIsDownloading(false);
            return;
        }

        try {
            // Include global styles for consistent rendering in PDF
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Reporte Clínico - ${person.full_name}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
                    <style>
                        ${printCss}
                    </style>
                </head>
                <body>
                    <div class="report-wrapper">
                        ${element.innerHTML}
                    </div>
                </body>
                </html>
            `;
    
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: htmlContent,
                    filename: `Reporte-${person.full_name.replace(/\s/g, '_')}.pdf`
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falló la generación del PDF en el servidor.');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte-${person.full_name.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
    
        } catch (error: any) {
            console.error("Error al generar PDF:", error);
            alert(`Hubo un error al generar el PDF: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
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
        const initial = consultations[consultations.length - 1]; 

        const pesoActual = current?.weight_kg;
        const pesoInicial = initial?.weight_kg;
        const perdidaPeso = (pesoInicial && pesoActual) ? (((pesoInicial - pesoActual) / pesoInicial) * 100) : null;

        return {
            pesoActual,
            pesoInicial,
            imcActual: current?.imc,
            imcAnterior: previous?.imc,
            perdidaPeso: perdidaPeso ? (perdidaPeso > 0 ? `-${perdidaPeso.toFixed(1)}%` : `+${Math.abs(perdidaPeso).toFixed(1)}%`) : null,
            colesterolActual: current?.lab_results?.[0]?.cholesterol_mg_dl,
            colesterolInicial: initial?.lab_results?.[0]?.cholesterol_mg_dl,
            trigliceridosActual: current?.lab_results?.[0]?.triglycerides_mg_dl,
            trigliceridosAnterior: previous?.lab_results?.[0]?.triglycerides_mg_dl,
            objetivoSalud: person.health_goal,
            glucosaCapilar: current?.lab_results?.[0]?.glucose_mg_dl,
            hba1c: current?.lab_results?.[0]?.hba1c,
            talla: current?.height_cm || initial?.height_cm,
        };
    }, [filteredConsultations, person.health_goal, consultations]);

    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate.replace(/-/g, '/'));
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return `${age}`;
    };

    // --- RENDER HELPERS ---

    const HeaderSection = () => (
        <header className="report-header">
            <div className="header-top-row">
                <div className="logo-area">
                    {clinic?.logo_url ? (
                        <img src={clinic.logo_url} alt="Logo" className="clinic-logo" />
                    ) : (
                        <div className="logo-placeholder">{clinic?.name?.charAt(0) || 'C'}</div>
                    )}
                </div>
                <div className="clinic-details-area">
                    <h1 className="clinic-name">{clinic?.name}</h1>
                    <div className="clinic-meta">
                        {nutritionistProfile?.full_name && <span>{nutritionistProfile.full_name}</span>}
                        {nutritionistProfile?.license_number && <span> • Céd. {nutritionistProfile.license_number}</span>}
                    </div>
                    <div className="clinic-contact">
                        {clinic?.address && <div>{clinic.address}</div>}
                        {clinic?.phone_number && <div>Tel: {clinic.phone_number}</div>}
                    </div>
                </div>
            </div>
            <div className="header-divider"></div>
        </header>
    );

    const PatientInfoSection = () => (
        <section className="patient-info-section no-break">
            <div className="patient-data-row">
                <div className="data-group">
                    <span className="data-label">Paciente</span>
                    <span className="data-value highlight">{person.full_name}</span>
                </div>
                <div className="data-group">
                    <span className="data-label">Edad / Género</span>
                    <span className="data-value">{calculateAge(person.birth_date)} años / {person.gender === 'male' ? 'H' : 'M'}</span>
                </div>
                 <div className="data-group">
                    <span className="data-label">Fecha</span>
                    <span className="data-value">{new Date().toLocaleDateString('es-MX')}</span>
                </div>
            </div>
            <div className="patient-data-row" style={{marginTop: '10px'}}>
                <div className="data-group">
                    <span className="data-label">Expediente</span>
                    <span className="data-value">{person.folio || 'N/A'}</span>
                </div>
                <div className="data-group" style={{flex: 2}}>
                    <span className="data-label">Objetivo</span>
                    <span className="data-value">{person.health_goal || 'General'}</span>
                </div>
            </div>
        </section>
    );

    const FooterSection = () => (
        <footer className="report-footer no-break">
            <div className="signature-area">
                <div className="signature-line"></div>
                <p className="signature-name">{nutritionistProfile?.full_name}</p>
                <p className="signature-cedula">{nutritionistProfile?.professional_title} | Cédula: {nutritionistProfile?.license_number}</p>
            </div>
            <div className="footer-legal">
                <p>Este documento es un reporte de progreso nutricional.</p>
                <p>{clinic?.name} | {clinic?.website || clinic?.email}</p>
            </div>
        </footer>
    );

    // --- PREVIEW RENDER ---

    const renderPreviewView = () => (
        <>
            <div style={{...styles.modalHeader}} className="no-print">
                <h2 style={styles.modalTitle}>Vista Previa del Reporte</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setView('config')} className="button-secondary">Editar Opciones</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="button-primary">
                        {isDownloading ? 'Generando PDF...' : <>{ICONS.download} Descargar PDF</>}
                    </button>
                </div>
            </div>
            
            <div style={{...styles.modalBody, backgroundColor: '#525659', padding: '2rem', display: 'flex', justifyContent: 'center'}}>
                {/* 
                    The wrapper mimics the Letter size paper.
                    Padding is applied here to simulate print margins.
                */}
                <div id="printable-area" className="paper-sheet">
                    <HeaderSection />
                    
                    <div className="report-body">
                        <PatientInfoSection />

                        {options.page1_results && (
                            <div className="report-section no-break">
                                <h2 className="section-title">RESUMEN DE PROGRESO</h2>
                                <div className="metrics-container">
                                    <div className="metric-box">
                                        <span className="m-label">Peso Actual</span>
                                        <span className="m-value">{reportData.pesoActual ?? '-'} <small>kg</small></span>
                                    </div>
                                    <div className="metric-box">
                                        <span className="m-label">IMC</span>
                                        <span className="m-value">{reportData.imcActual ?? '-'}</span>
                                    </div>
                                    <div className="metric-box highlight-box">
                                        <span className="m-label">Cambio Total</span>
                                        <span className="m-value">{reportData.perdidaPeso ?? '-'}</span>
                                    </div>
                                    <div className="metric-box">
                                        <span className="m-label">Glucosa</span>
                                        <span className="m-value">{reportData.glucosaCapilar ?? '-'} <small>mg/dl</small></span>
                                    </div>
                                </div>
                                
                                <div className="details-columns">
                                    <div className="detail-col">
                                        <div className="detail-row"><span>Talla:</span> <strong>{reportData.talla} cm</strong></div>
                                        <div className="detail-row"><span>Peso Inicial:</span> <strong>{reportData.pesoInicial} kg</strong></div>
                                        <div className="detail-row"><span>Peso Actual:</span> <strong>{reportData.pesoActual} kg</strong></div>
                                    </div>
                                    <div className="detail-col">
                                        <div className="detail-row"><span>Colesterol:</span> <strong>{reportData.colesterolActual ?? '-'} mg/dL</strong></div>
                                        <div className="detail-row"><span>Triglicéridos:</span> <strong>{reportData.trigliceridosActual ?? '-'} mg/dL</strong></div>
                                        <div className="detail-row"><span>HbA1c:</span> <strong>{reportData.hba1c ?? '-'} %</strong></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {options.page2_charts && (
                            <div className="report-section no-break">
                                <h2 className="section-title">GRÁFICAS DE EVOLUCIÓN</h2>
                                <div className="charts-wrapper">
                                    <div className="single-chart">
                                        <ProgressChart title="Peso (kg)" data={filteredConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }))} unit="kg" isPrinting={true} />
                                    </div>
                                    <div className="single-chart">
                                        <ProgressChart title="IMC" data={filteredConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }))} unit="pts" isPrinting={true} color="#8B5CF6" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {options.page3_tables && (
                            <div className="report-section">
                                <h2 className="section-title">HISTORIAL DE CONSULTAS</h2>
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Peso (kg)</th>
                                            <th>IMC</th>
                                            <th>Tensión A.</th>
                                            <th>Glucosa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredConsultations.slice(0, 10).map(c => (
                                            <tr key={c.id} className="no-break">
                                                <td>{new Date(c.consultation_date).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</td>
                                                <td>{c.weight_kg}</td>
                                                <td>{c.imc}</td>
                                                <td>{c.ta || '-'}</td>
                                                <td>{c.lab_results?.[0]?.glucose_mg_dl || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {options.page4_welcome && (
                            <div className="report-section disclaimer-box no-break">
                                <h3>Notas Importantes</h3>
                                <p>Este reporte refleja el progreso obtenido durante el periodo de tratamiento. Los resultados pueden variar según la adherencia al plan.</p>
                                <ul>
                                    <li>Mantén tu hidratación adecuada.</li>
                                    <li>Sigue las indicaciones de actividad física.</li>
                                </ul>
                            </div>
                        )}
                        
                        <FooterSection />
                    </div>
                </div>
            </div>
        </>
    );

    const renderConfigView = () => (
        <>
            <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Configurar Reporte</h2>
                <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
            </div>
            <div style={styles.modalBody}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                    <div>
                        <h3 style={{fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem'}}>Secciones a Incluir</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                             {Object.entries({
                                page1_results: "Resumen de Resultados",
                                page2_charts: "Gráficas Visuales",
                                page3_tables: "Tablas de Datos",
                                page4_welcome: "Notas y Recomendaciones"
                            }).map(([key, label]) => (
                                <label key={key} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', cursor: 'pointer'}}>
                                    <input type="checkbox" id={key} name={key} checked={options[key as keyof typeof options]} onChange={handleOptionChange} style={{width: '18px', height: '18px'}} />
                                    <span style={{fontSize: '0.95rem'}}>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 style={{fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem'}}>Rango de Fechas</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            <div>
                                <label style={styles.label}>Desde</label>
                                <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Hasta</label>
                                <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} style={styles.input} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div style={styles.modalFooter}>
                <button onClick={onClose} className="button-secondary">Cancelar</button>
                <button onClick={() => setView('preview')} className="button-primary">Generar Vista Previa</button>
            </div>
        </>
    );

    return createPortal(
        <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, width: '95%', maxWidth: '1000px', height: '90vh', padding: 0}} className="fade-in">
                {view === 'config' ? renderConfigView() : renderPreviewView()}
            </div>
        </div>,
        modalRoot
    );
};

// CSS Injection for PDF generation.
const printCss = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    /* Global Resets */
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; background: #fff; color: #111; line-height: 1.3; font-size: 10pt; }
    * { box-sizing: border-box; }

    /* Page Configuration - CRITICAL for PDF Generation */
    @page {
        size: Letter;
        margin: 0; /* We handle margins via padding in .paper-sheet */
    }

    /* Container simulating the paper sheet */
    .paper-sheet {
        width: 215.9mm; /* Exact Letter Width */
        min-height: 279.4mm;
        margin: 0 auto;
        padding: 15mm; /* Physical printable margins */
        background: white;
        position: relative;
    }

    /* --- Header --- */
    .report-header {
        margin-bottom: 20px;
    }
    .header-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }
    .clinic-logo {
        max-height: 50px;
        max-width: 150px;
        object-fit: contain;
    }
    .logo-placeholder {
        width: 50px; height: 50px; background: #eee; color: #999;
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; border-radius: 4px;
    }
    .clinic-details-area {
        text-align: right;
    }
    .clinic-name {
        font-size: 16pt;
        font-weight: 700;
        color: #0284C7;
        margin: 0 0 4px 0;
    }
    .clinic-meta {
        font-size: 9pt;
        font-weight: 500;
        margin-bottom: 2px;
    }
    .clinic-contact {
        font-size: 8pt;
        color: #666;
    }
    .header-divider {
        height: 3px;
        background: #0284C7;
        width: 100%;
    }

    /* --- Patient Info Grid --- */
    .patient-info-section {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 15px;
        margin-bottom: 25px;
    }
    .patient-data-row {
        display: flex;
        justify-content: space-between;
        gap: 15px;
    }
    .data-group {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .data-label {
        font-size: 7pt;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
        letter-spacing: 0.5px;
    }
    .data-value {
        font-size: 10pt;
        color: #0f172a;
        font-weight: 500;
    }
    .data-value.highlight {
        font-weight: 700;
        font-size: 11pt;
    }

    /* --- General Section Styles --- */
    .section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #0284C7;
        text-transform: uppercase;
        border-bottom: 1px solid #e0e7ff;
        padding-bottom: 4px;
        margin: 0 0 15px 0;
    }
    .report-section {
        margin-bottom: 25px;
    }

    /* --- Metrics (Cards) --- */
    .metrics-container {
        display: flex;
        gap: 12px;
        margin-bottom: 15px;
    }
    .metric-box {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        text-align: center;
        background: #fff;
    }
    .metric-box.highlight-box {
        background-color: #f0f9ff;
        border-color: #bae6fd;
    }
    .m-label {
        display: block;
        font-size: 7pt;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 4px;
    }
    .m-value {
        display: block;
        font-size: 13pt;
        font-weight: 700;
        color: #0f172a;
    }

    /* --- Detailed Columns --- */
    .details-columns {
        display: flex;
        gap: 30px;
        margin-bottom: 10px;
    }
    .detail-col {
        flex: 1;
    }
    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px dashed #e2e8f0;
        font-size: 9pt;
    }

    /* --- Charts --- */
    .charts-wrapper {
        display: flex;
        gap: 15px;
    }
    .single-chart {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px;
        background: #fff;
        height: 180px; /* Fixed height for charts */
    }

    /* --- Tables --- */
    .history-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
    }
    .history-table th {
        text-align: left;
        padding: 6px;
        background-color: #f1f5f9;
        color: #475569;
        font-weight: 600;
        border-bottom: 2px solid #cbd5e1;
    }
    .history-table td {
        padding: 6px;
        border-bottom: 1px solid #e2e8f0;
    }
    .history-table tr:nth-child(even) {
        background-color: #f8fafc;
    }

    /* --- Disclaimer --- */
    .disclaimer-box {
        background-color: #fffbeb;
        border: 1px solid #fcd34d;
        padding: 10px;
        border-radius: 6px;
        font-size: 8pt;
        color: #92400e;
    }
    .disclaimer-box h3 { margin: 0 0 5px 0; font-size: 9pt; }
    .disclaimer-box ul { margin: 0; padding-left: 20px; }

    /* --- Footer --- */
    .report-footer {
        margin-top: 30px;
        text-align: center;
    }
    .signature-area {
        width: 220px;
        margin: 0 auto 20px auto;
    }
    .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 5px;
    }
    .signature-name {
        font-weight: 700; margin: 0; font-size: 10pt;
    }
    .signature-cedula {
        margin: 0; font-size: 8pt; color: #666;
    }
    .footer-legal {
        font-size: 7pt;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
    }

    /* --- Print Utilities --- */
    .no-break {
        page-break-inside: avoid;
        break-inside: avoid;
    }

    @media print {
        .no-print { display: none !important; }
        body { background-color: white; }
        .report-wrapper {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
        }
        .page-break-inside-avoid {
            page-break-inside: avoid;
        }
    }
`;

export default ReportModal;
