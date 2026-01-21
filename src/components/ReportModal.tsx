
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

        // Get the SVG charts and convert them to base64 images for reliable PDF rendering
        // This is a simplified approach; usually handled by the chart library or server-side rendering
        // For this implementation, we rely on Puppeteer's ability to render SVGs.
    
        try {
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
                    ${element.innerHTML}
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
        const initial = consultations[consultations.length - 1]; // Always compare against absolute initial

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
            <div className="header-content">
                <div className="logo-container">
                    {clinic?.logo_url ? (
                        <img src={clinic.logo_url} alt="Logo" className="clinic-logo" />
                    ) : (
                        <div className="logo-placeholder">{clinic?.name?.charAt(0) || 'C'}</div>
                    )}
                </div>
                <div className="clinic-info">
                    <h1 className="clinic-name">{clinic?.name}</h1>
                    <div className="clinic-details">
                        {nutritionistProfile?.full_name && <p>{nutritionistProfile.full_name}</p>}
                        {nutritionistProfile?.professional_title && <p>{nutritionistProfile.professional_title} - Céd. {nutritionistProfile.license_number}</p>}
                        {clinic?.address && <p>{clinic.address}</p>}
                        {clinic?.phone_number && <p>Tel: {clinic.phone_number}</p>}
                    </div>
                </div>
            </div>
            <div className="header-divider"></div>
        </header>
    );

    const PatientInfoSection = () => (
        <section className="patient-info-section">
            <div className="patient-grid">
                <div className="patient-cell">
                    <span className="label">PACIENTE</span>
                    <span className="value bold">{person.full_name}</span>
                </div>
                <div className="patient-cell">
                    <span className="label">EDAD</span>
                    <span className="value">{calculateAge(person.birth_date)} Años</span>
                </div>
                <div className="patient-cell">
                    <span className="label">GÉNERO</span>
                    <span className="value">{person.gender === 'male' ? 'Masculino' : 'Femenino'}</span>
                </div>
                <div className="patient-cell">
                    <span className="label">FECHA</span>
                    <span className="value">{new Date().toLocaleDateString('es-MX')}</span>
                </div>
                <div className="patient-cell">
                    <span className="label">EXPEDIENTE</span>
                    <span className="value">{person.folio || 'N/A'}</span>
                </div>
                <div className="patient-cell">
                    <span className="label">OBJETIVO</span>
                    <span className="value">{person.health_goal || 'General'}</span>
                </div>
            </div>
        </section>
    );

    const FooterSection = () => (
        <footer className="report-footer">
            <div className="signature-box">
                <div className="signature-line"></div>
                <p className="signature-name">{nutritionistProfile?.full_name}</p>
                <p className="signature-title">{nutritionistProfile?.professional_title} | Cédula: {nutritionistProfile?.license_number}</p>
            </div>
            <div className="footer-disclaimer">
                <p>Este documento es un reporte de seguimiento nutricional y no sustituye una receta médica.</p>
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
                <div id="printable-area" className="report-document">
                    {/* Only one Header for the document flow, CSS handles paging */}
                    <HeaderSection />
                    
                    <div className="document-body">
                        <PatientInfoSection />

                        {options.page1_results && (
                            <div className="report-section">
                                <h2 className="section-title">RESUMEN DE PROGRESO</h2>
                                <div className="metrics-grid">
                                    <div className="metric-card">
                                        <span className="metric-label">Peso Actual</span>
                                        <span className="metric-value">{reportData.pesoActual ?? '-'} <small>kg</small></span>
                                        <span className="metric-diff">{reportData.pesoInicial ? `Inicio: ${reportData.pesoInicial} kg` : ''}</span>
                                    </div>
                                    <div className="metric-card">
                                        <span className="metric-label">IMC</span>
                                        <span className="metric-value">{reportData.imcActual ?? '-'}</span>
                                        <span className="metric-diff">{reportData.imcAnterior ? `Previo: ${reportData.imcAnterior}` : ''}</span>
                                    </div>
                                    <div className="metric-card highlight">
                                        <span className="metric-label">Cambio Total</span>
                                        <span className="metric-value">{reportData.perdidaPeso ?? '-'}</span>
                                        <span className="metric-diff">Peso Corporal</span>
                                    </div>
                                    <div className="metric-card">
                                        <span className="metric-label">Glucosa</span>
                                        <span className="metric-value">{reportData.glucosaCapilar ?? '-'} <small>mg/dl</small></span>
                                    </div>
                                </div>
                                
                                <div className="two-column-layout">
                                    <div className="data-list">
                                        <h3>Antropometría</h3>
                                        <div className="data-row"><span>Talla:</span> <strong>{reportData.talla} cm</strong></div>
                                        <div className="data-row"><span>Peso Inicial:</span> <strong>{reportData.pesoInicial} kg</strong></div>
                                        <div className="data-row"><span>Peso Actual:</span> <strong>{reportData.pesoActual} kg</strong></div>
                                        <div className="data-row"><span>IMC Actual:</span> <strong>{reportData.imcActual}</strong></div>
                                    </div>
                                    <div className="data-list">
                                        <h3>Laboratorios Recientes</h3>
                                        <div className="data-row"><span>Glucosa:</span> <strong>{reportData.glucosaCapilar ?? '-'} mg/dL</strong></div>
                                        <div className="data-row"><span>HbA1c:</span> <strong>{reportData.hba1c ?? '-'} %</strong></div>
                                        <div className="data-row"><span>Colesterol:</span> <strong>{reportData.colesterolActual ?? '-'} mg/dL</strong></div>
                                        <div className="data-row"><span>Triglicéridos:</span> <strong>{reportData.trigliceridosActual ?? '-'} mg/dL</strong></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {options.page2_charts && (
                            <div className="report-section page-break-inside-avoid">
                                <h2 className="section-title">GRÁFICAS DE EVOLUCIÓN</h2>
                                <div className="charts-container">
                                    <div className="chart-wrapper">
                                        <ProgressChart title="Evolución de Peso" data={filteredConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }))} unit="kg" isPrinting={true} />
                                    </div>
                                    <div className="chart-wrapper">
                                        <ProgressChart title="Evolución de IMC" data={filteredConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }))} unit="pts" isPrinting={true} color="#8B5CF6" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {options.page3_tables && (
                            <div className="report-section">
                                <h2 className="section-title">HISTORIAL DE CONSULTAS</h2>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Peso (kg)</th>
                                            <th>IMC</th>
                                            <th>Cintura (cm)</th>
                                            <th>Glucosa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredConsultations.slice(0, 10).map(c => (
                                            <tr key={c.id}>
                                                <td>{new Date(c.consultation_date).toLocaleDateString('es-MX')}</td>
                                                <td>{c.weight_kg}</td>
                                                <td>{c.imc}</td>
                                                <td>-</td>
                                                <td>{c.lab_results?.[0]?.glucose_mg_dl || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {options.page4_welcome && (
                            <div className="report-section disclaimer-section">
                                <h3>Notas Importantes</h3>
                                <p>Este reporte refleja el progreso obtenido durante el periodo de tratamiento nutricional. Los resultados pueden variar según la adherencia al plan y factores metabólicos individuales.</p>
                                <ul>
                                    <li>Recuerda seguir las recomendaciones de hidratación.</li>
                                    <li>Mantén tu actividad física según lo acordado.</li>
                                    <li>Cualquier duda sobre este reporte, contacta a tu especialista.</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <FooterSection />
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

const printCss = `
    body { font-family: 'Roboto', sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 0; background-color: #fff; }
    
    @page { margin: 0; size: Letter; }
    
    .report-document {
        width: 100%;
        max-width: 21.59cm; /* Letter Width */
        min-height: 27.94cm; /* Letter Height */
        margin: 0 auto;
        background-color: white;
        padding: 1.5cm;
        box-sizing: border-box;
        position: relative;
    }

    /* Header */
    .report-header {
        display: flex;
        flex-direction: column;
        margin-bottom: 20px;
    }
    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    .clinic-logo {
        max-height: 60px;
        max-width: 150px;
        object-fit: contain;
    }
    .logo-placeholder {
        width: 50px; height: 50px; background: #eee; color: #999; 
        display: flex; align-items: center; justify-content: center; 
        font-weight: bold; border-radius: 4px;
    }
    .clinic-info {
        text-align: right;
    }
    .clinic-name {
        font-size: 16pt;
        font-weight: 700;
        color: #1a365d;
        margin: 0 0 5px 0;
    }
    .clinic-details p {
        margin: 2px 0;
        font-size: 8pt;
        color: #666;
    }
    .header-divider {
        height: 3px;
        background: linear-gradient(90deg, #38BDF8 0%, #0284C7 100%);
        width: 100%;
        border-radius: 2px;
    }

    /* Patient Info */
    .patient-info-section {
        margin-bottom: 25px;
        padding: 12px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    .patient-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 10px 20px;
    }
    .patient-cell {
        display: flex;
        flex-direction: column;
    }
    .label {
        font-size: 7pt;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
    }
    .value {
        font-size: 10pt;
        color: #0f172a;
        font-weight: 500;
    }
    .value.bold {
        font-weight: 700;
        font-size: 11pt;
    }

    /* Sections */
    .section-title {
        font-size: 12pt;
        font-weight: 700;
        color: #0284C7;
        text-transform: uppercase;
        border-bottom: 1px solid #e0e7ff;
        padding-bottom: 5px;
        margin: 20px 0 15px 0;
    }
    
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 20px;
    }
    .metric-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        background: #fff;
    }
    .metric-card.highlight {
        background-color: #f0f9ff;
        border-color: #bae6fd;
    }
    .metric-label {
        display: block;
        font-size: 8pt;
        color: #64748b;
        margin-bottom: 5px;
    }
    .metric-value {
        display: block;
        font-size: 14pt;
        font-weight: 700;
        color: #0f172a;
    }
    .metric-diff {
        display: block;
        font-size: 7pt;
        color: #0ea5e9;
        margin-top: 2px;
    }

    .two-column-layout {
        display: flex;
        gap: 30px;
    }
    .data-list {
        flex: 1;
    }
    .data-list h3 {
        font-size: 10pt;
        margin: 0 0 10px 0;
        color: #334155;
    }
    .data-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dotted #cbd5e1;
        font-size: 9pt;
    }

    /* Tables */
    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
        margin-bottom: 20px;
    }
    .data-table th {
        background-color: #f1f5f9;
        color: #475569;
        font-weight: 600;
        text-align: left;
        padding: 8px;
        border-bottom: 2px solid #cbd5e1;
    }
    .data-table td {
        padding: 8px;
        border-bottom: 1px solid #e2e8f0;
        color: #333;
    }
    .data-table tr:nth-child(even) {
        background-color: #f8fafc;
    }

    /* Charts */
    .charts-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
    }
    .chart-wrapper {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        background: #fff;
    }
    
    /* Disclaimer */
    .disclaimer-section {
        background-color: #fffbeb;
        border: 1px solid #fcd34d;
        padding: 15px;
        border-radius: 6px;
        font-size: 9pt;
        color: #92400e;
        margin-top: 20px;
    }
    .disclaimer-section h3 {
        margin: 0 0 5px 0;
        font-size: 10pt;
    }
    .disclaimer-section ul {
        margin: 5px 0 0 0;
        padding-left: 20px;
    }

    /* Footer */
    .report-footer {
        margin-top: 40px;
        position: relative;
        break-inside: avoid;
    }
    .signature-box {
        width: 250px;
        margin: 0 auto 30px auto;
        text-align: center;
    }
    .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 5px;
    }
    .signature-name {
        font-weight: 700;
        font-size: 10pt;
        margin: 0;
    }
    .signature-title {
        font-size: 8pt;
        color: #666;
        margin: 0;
    }
    .footer-disclaimer {
        font-size: 7pt;
        color: #94a3b8;
        text-align: center;
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
    }

    /* Print Specifics */
    @media print {
        .no-print { display: none !important; }
        body { background: none; }
        .report-document {
            box-shadow: none;
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: none;
        }
        .page-break-inside-avoid {
            page-break-inside: avoid;
        }
    }
`;

export default ReportModal;
