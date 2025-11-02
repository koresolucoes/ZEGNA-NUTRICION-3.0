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
}

const modalRoot = document.getElementById('modal-root');

const ReportModal: FC<ReportModalProps> = ({ person, consultations, dietLogs, exerciseLogs, allergies, medicalHistory, medications, lifestyleHabits, isMobile, onClose, nutritionistProfile, clinic }) => {
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
    const [isPrinting, setIsPrinting] = useState(false);

    const showBranding = useMemo(() => {
        // Show branding by default unless the plan explicitly sets it to false.
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

    const printReport = () => { window.print(); };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        setIsPrinting(true); 
        await new Promise(resolve => setTimeout(resolve, 100));
    
        const element = document.getElementById('printable-area');
        if (!element) {
            alert("Contenido del reporte no encontrado.");
            setIsDownloading(false);
            setIsPrinting(false);
            return;
        }
    
        const mainStyles = document.querySelector('style')?.innerHTML || '';
    
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
                    <style>
                        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        @page { size: A4; margin: 15mm; }
                        .report-page { page-break-after: always; }
                        ${mainStyles}
                        #printable-area, #printable-area * { color: #000 !important; }
                        .report-chart-bg { background-color: #2a3f5f !important; }
                    </style>
                </head>
                <body>
                    ${element.outerHTML}
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
            setIsPrinting(false);
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

    const renderConfigView = () => (
        <>
            <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Generar Reporte Personalizado</h2>
                <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
            </div>
            <div style={styles.modalBody}>
                <h3 style={reportStyles.sectionTitle}>Seleccionar Secciones</h3>
                <div style={reportStyles.optionsGrid}>
                     {Object.entries({
                        page1_results: "Detalle de Resultados",
                        page2_charts: "Gráficas de Progreso",
                        page3_tables: "Tablas de Datos",
                        page4_welcome: "Mensaje de Bienvenida"
                    }).map(([key, label]) => (
                        <div key={key} style={reportStyles.checkboxContainer}>
                            <input type="checkbox" id={key} name={key} checked={options[key as keyof typeof options]} onChange={handleOptionChange} />
                            <label htmlFor={key} style={{marginBottom: 0, fontWeight: 'normal'}}>{label}</label>
                        </div>
                    ))}
                </div>

                <h3 style={reportStyles.sectionTitle}>Filtrar por Fecha (Opcional)</h3>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label>Desde</label>
                        <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} style={{margin: 0}} />
                    </div>
                    <div style={{flex: 1}}>
                        <label>Hasta</label>
                        <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} style={{margin: 0}} />
                    </div>
                </div>
            </div>
            <div style={styles.modalFooter}>
                <button onClick={onClose} className="button-secondary">Cancelar</button>
                <button onClick={() => setView('preview')}>Generar Vista Previa</button>
            </div>
        </>
    );
    
    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return `${age} AÑOS`;
    };

    const ReportPage: FC<{
        children: React.ReactNode;
        footerText: string;
        isLastPage?: boolean;
    }> = ({ children, footerText, isLastPage }) => (
        <div className="report-page" style={{...reportStyles.page, breakAfter: isLastPage ? 'auto' : 'always'}}>
            <header style={reportStyles.pageHeader}>
                <img src={clinic?.logo_url || "https://i.imgur.com/NOdUorv.png"} alt="Logo" style={{ height: '70px', width: 'auto', maxHeight: '70px', objectFit: 'contain' }} />
                <div style={{textAlign: 'right', fontSize: '10px'}}>
                    <p style={{margin:0}}>Fecha de impresión: {new Date().toLocaleString('es-MX')}</p>
                    <p style={{margin:0}}>Actualizado a la consulta: {new Date().toLocaleDateString('es-MX')}</p>
                </div>
            </header>
            <main style={{flex: 1}}>
                {children}
            </main>
            <footer style={reportStyles.pageFooter}>
                <p style={{margin: 0}}>{footerText}</p>
            </footer>
        </div>
    );
    
    const MetricRow: FC<{label: string, value: any, unit?: string}> = ({ label, value, unit }) => (
        <div style={reportStyles.metricRow}>
            <span style={{whiteSpace: 'nowrap'}}>{label}</span>
            <span style={reportStyles.dots}></span>
            <span style={{whiteSpace: 'nowrap'}}><strong>{value ?? '...'}</strong> {unit}</span>
        </div>
    );

    const renderPreviewView = () => (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background-color: #fff !important; }
                    body > *:not(#modal-root) { display: none; }
                    #modal-root, #modal-root > div {
                        position: static !important; display: block !important;
                        background: transparent !important; padding: 0 !important;
                        overflow: visible !important;
                    }
                    #modal-root > div > div {
                        width: 100% !important; max-width: 100% !important;
                        height: auto !important; max-height: none !important;
                        box-shadow: none !important; border: none !important;
                    }
                    #printable-area { padding: 0 !important; background-color: #fff !important; }
                    .report-page {
                        page-break-after: always;
                    }
                }
            `}</style>
            <div style={{...styles.modalHeader}} className="no-print">
                <h2 style={styles.modalTitle}>Vista Previa del Reporte</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setView('config')} className="button-secondary">Volver</button>
                    <button onClick={printReport} className="button-secondary">{ICONS.print} Imprimir</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading}>{isDownloading ? 'Generando...' : ICONS.download} PDF</button>
                </div>
            </div>
            <div style={{...styles.modalBody, backgroundColor: '#e0e0e0'}}>
                <div id="printable-area" style={reportStyles.previewContainer}>
                    {/* PAGE 1 */}
                    {options.page1_results && (
                        <ReportPage footerText={showBranding ? "*Este documento es confidencial y de uso exclusivo del paciente y del equipo que conforma ZEGNA NUTRICION, su divulgación no autorizada podría traer graves consecuencias al responsable." : "*Este documento es confidencial y de uso exclusivo del paciente y del equipo de la clínica."}>
                            <div style={reportStyles.patientInfoBar}>
                                <span>Paciente: <strong>{person.full_name.toUpperCase()}</strong></span>
                                <span>Sexo: <strong>{person.gender === 'male' ? 'MASCULINO' : 'FEMENINO'}</strong></span>
                                <span>Edad: <strong>{calculateAge(person.birth_date)}</strong></span>
                            </div>
                             <div style={reportStyles.patientInfoBar2}>
                                <span>Dirección: <strong>{person.address || 'N/A'}</strong></span>
                            </div>
                             <div style={reportStyles.patientInfoBar2}>
                                <span>Teléfono: <strong>{person.phone_number || 'N/A'}</strong></span>
                                <span>Clave: <strong>{person.folio || 'N/A'}</strong></span>
                            </div>
                            <h2 style={reportStyles.pageTitle}>DETALLE DE RESULTADOS</h2>
                            <div style={reportStyles.twoColLayout}>
                                <div style={{fontFamily: 'monospace', fontSize: '12px'}}>
                                    <MetricRow label="Peso actual" value={reportData.pesoActual?.toFixed(1)} unit="kg" />
                                    <MetricRow label="Peso inicial" value={reportData.pesoInicial?.toFixed(1)} unit="kg" />
                                    <MetricRow label="IMC actual" value={reportData.imcActual?.toFixed(1)} />
                                    <MetricRow label="IMC anterior" value={reportData.imcAnterior?.toFixed(1)} />
                                    <MetricRow label="Pérdida de peso" value={reportData.perdidaPeso} />
                                    <MetricRow label="Nivel de colesterol actual" value={reportData.colesterolActual} unit="mg/dl" />
                                    <MetricRow label="Nivel de colesterol inicial" value={reportData.colesterolInicial} unit="mg/dl" />
                                    <MetricRow label="Nivel de triglicéridos actual" value={reportData.trigliceridosActual} unit="mg/dl" />
                                    <MetricRow label="Nivel de triglicéridos anterior" value={reportData.trigliceridosAnterior} unit="mg/dl" />
                                    <MetricRow label="Objetivo de salud" value={reportData.objetivoSalud || 'N/A'} />
                                    <MetricRow label="Glucosa capilar" value={reportData.glucosaCapilar} unit="mg/dl" />
                                    <MetricRow label="HbA1c" value={reportData.hba1c} unit="%" />
                                    <MetricRow label="Talla" value={reportData.talla} unit="cm" />
                                </div>
                                <div style={reportStyles.disclaimerList}>
                                    <p>* Se proporciona acceso a Ecosistema Zegna por un periodo de 30 Días bajo la suscripción del consultorio nutricional que lo remite.</p>
                                    <p>* Los datos recopilados son única y exclusivamente con fines de tratamiento, esto con los protocolos más altos de confidencialidad.</p>
                                    <p>* Se proporciona acceso a herramientas tecnológicas avanzadas con la finalidad de un tratamiento más cercano a la altura de nuestros clientes.</p>
                                    <p>* Se exhorta a los usuarios en caso de presentar algún inconveniente hacerlo de nuestro conocimiento para dar seguimiento a la brevedad posible.</p>
                                    <p>* De conformidad con la Ley Federal de Protección de Datos en Posesión de Particulares, usted puede ejercer sus derechos ARCO respecto al tratamiento de sus datos personales.</p>
                                </div>
                            </div>
                        </ReportPage>
                    )}
                    
                    {/* PAGE 2 */}
                    {options.page2_charts && (
                        <ReportPage footerText="*Los resultados mostrados no sustituyen al formato oficial que entrega impreso el consultorio nutricional, su carácter es exclusivamente informativo.">
                             <div style={reportStyles.patientInfoBar}>
                                <span>Paciente: <strong>{person.full_name.toUpperCase()}</strong></span>
                                <span>Sexo: <strong>{person.gender === 'male' ? 'MASCULINO' : 'FEMENINO'}</strong></span>
                                <span>Edad: <strong>{calculateAge(person.birth_date)}</strong></span>
                            </div>
                            <h2 style={reportStyles.pageTitle}>GRAFICAS DE PROGRESO</h2>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <ProgressChart theme="dark" title="Peso (kg)" data={filteredConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }))} unit="kg" />
                                <ProgressChart theme="dark" title="IMC (pts)" data={filteredConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }))} unit="pts" />
                                <ProgressChart theme="dark" title="Niveles de Triglicéridos (mg/dl)" data={filteredConsultations.filter(c => c.lab_results?.[0]?.triglycerides_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].triglycerides_mg_dl! }))} unit="mg/dl" />
                                <ProgressChart theme="dark" title="Niveles de Colesterol (mg/dl)" data={filteredConsultations.filter(c => c.lab_results?.[0]?.cholesterol_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].cholesterol_mg_dl! }))} unit="mg/dl" />
                            </div>
                        </ReportPage>
                    )}
                    
                    {/* PAGE 3 */}
                    {options.page3_tables && (
                        <ReportPage footerText={showBranding ? "*Este documento es confidencial y de uso exclusivo del paciente y del equipo que conforma ZEGNA NUTRICION, su divulgación no autorizada podría traer graves consecuencias al responsable." : "*Este documento es confidencial y de uso exclusivo del paciente y del equipo de la clínica."}>
                             <h2 style={reportStyles.pageTitle}>TU CONSULTA DE INFORMACIÓN ES GRATUITA</h2>
                             <h3 style={{...reportStyles.tableTitle, marginTop: '2rem'}}>Consultas recientes</h3>
                             <table style={reportStyles.reportTable}>
                                <thead>
                                    <tr>
                                        <th style={reportStyles.reportTh}>Fecha</th>
                                        <th style={reportStyles.reportTh}>Peso (kg)</th>
                                        <th style={reportStyles.reportTh}>IMC</th>
                                        <th style={reportStyles.reportTh}>Glucosa capilar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...filteredConsultations].slice(0,6).map(c => (
                                        <tr key={c.id}>
                                            <td style={reportStyles.reportTd}>{new Date(c.consultation_date).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</td>
                                            <td style={reportStyles.reportTd}>{c.weight_kg}</td>
                                            <td style={reportStyles.reportTd}>{c.imc}</td>
                                            <td style={reportStyles.reportTd}>{c.lab_results?.[0]?.glucose_mg_dl || '-'} de 99</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                             <h3 style={{...reportStyles.tableTitle, marginTop: '2rem'}}>Otros parámetros te pueden interesar</h3>
                             <table style={reportStyles.reportTable}>
                                <thead>
                                    <tr>
                                        <th style={reportStyles.reportTh}>Fecha</th>
                                        <th style={reportStyles.reportTh}>Colesterol (mg/dl)</th>
                                        <th style={reportStyles.reportTh}>Triglicéridos (mg/dl)</th>
                                        <th style={reportStyles.reportTh}>HbA1c (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {[...filteredConsultations].slice(0,6).map(c => (
                                        <tr key={c.id}>
                                            <td style={reportStyles.reportTd}>{new Date(c.consultation_date).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</td>
                                            <td style={reportStyles.reportTd}>{c.lab_results?.[0]?.cholesterol_mg_dl || '-'} de 200</td>
                                            <td style={reportStyles.reportTd}>{c.lab_results?.[0]?.triglycerides_mg_dl || '-'} de 150</td>
                                            <td style={reportStyles.reportTd}>{c.lab_results?.[0]?.hba1c || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </ReportPage>
                    )}
                    
                    {/* PAGE 4 */}
                    {options.page4_welcome && (
                        <ReportPage isLastPage={true} footerText="*Los resultados mostrados no sustituyen al formato oficial que entrega impreso el consultorio nutricional, su carácter es exclusivamente informativo.">
                            <div style={{...reportStyles.welcomeText, lineHeight: '1.8', fontSize: '11pt', textAlign: 'justify', padding: '1rem'}}>
                                <h2 style={{...reportStyles.pageTitle, textAlign: 'left'}}>
                                    Es un placer darte la bienvenida{showBranding ? ' a ZEGNA NUTRICION,' : ','}
                                </h2>
                                <p>Un espacio diseñado para acompañarte en el camino hacia una mejor versión, creemos firmemente que una correcta alimentación es el reflejo no solo de cambios estéticos, su impacto va más allá, por lo que aplicamos la nutrición como un pilar de vida, como una herramienta para la salud y la prevención de enfermedades a corto y largo plazo.</p>
                                <p>En nuestra comunidad, adaptamos cada recomendación a su historial médico, estilo de vida y metas únicas, basamos nuestras estrategias en evidencia actualizada y enfoques preventivos, trabajamos en sinergia con otros profesionales de la salud, reconociendo la importancia de un tratamiento multidisciplinar.</p>
                                <p>Te recomendamos consultas menos centradas en la báscula y más en indicadores de salud reales, mencionado lo anterior nos comprometemos a guiarte en este proceso, brindándote apoyo, educación y estrategias prácticas que se adapten a tu estilo de vida.</p>
                                <p>Te invitamos a aprovechar al máximo esta experiencia, realizar tus preguntas, expresar inquietudes y sobre todo, disfrutar el viaje hacia un bienestar optimo, si existe la necesidad.</p>

                                <div style={{marginTop: '4rem', textAlign: 'center'}}>
                                    <div style={{
                                        borderBottom: '1px dotted black', 
                                        width: '250px', 
                                        margin: '0 auto 5px auto',
                                        height: '40px'
                                    }}></div>
                                    <p style={{margin: 0, fontWeight: 'bold'}}>
                                        {nutritionistProfile?.full_name}
                                    </p>
                                    {nutritionistProfile?.license_number && (
                                        <p style={{margin: '2px 0 0 0', fontSize: '11px'}}>
                                            Cédula Profesional: {nutritionistProfile.license_number}
                                        </p>
                                    )}
                                    <p style={{margin: '5px 0 0 0', fontSize: '10px'}}>[Firma digital o sello]</p>
                                </div>
                            </div>
                        </ReportPage>
                    )}
                </div>
            </div>
        </>
    );

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '900px', maxHeight: '90vh'}} className="fade-in">
                {view === 'config' ? renderConfigView() : renderPreviewView()}
            </div>
        </div>,
        modalRoot
    );
};

const reportStyles: {[key: string]: React.CSSProperties} = {
    previewContainer: { backgroundColor: '#fff', color: '#000', borderRadius: '8px', padding: '1rem', fontFamily: 'serif' },
    page: { backgroundColor: '#fff', minHeight: '1123px', width: '794px', margin: '0 auto', padding: '40px', display: 'flex', flexDirection: 'column' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '10px'},
    pageFooter: { borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: 'auto', fontSize: '9px', textAlign: 'center', color: '#555' },
    patientInfoBar: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '11px', flexWrap: 'wrap', gap: '1rem' },
    patientInfoBar2: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '11px', gap: '2rem' },
    pageTitle: { textAlign: 'center', fontWeight: 'bold', fontSize: '14px', margin: '20px 0' },
    twoColLayout: { display: 'flex', gap: '2rem', marginTop: '1rem' },
    metricRow: { display: 'flex', alignItems: 'baseline', marginBottom: '8px' },
    dots: { flexGrow: 1, borderBottom: '1px dotted #999', margin: '0 5px', transform: 'translateY(-4px)' },
    disclaimerList: { flex: '1 1 40%', fontSize: '11px', color: '#333', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem'},
    tableTitle: { fontSize: '12px', fontWeight: 'bold' },
    reportTable: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#000', border: '1px solid #333' },
    reportTh: {
        border: '1px solid #333',
        padding: '8px',
        textAlign: 'center' as 'center',
        fontWeight: 'bold',
        backgroundColor: '#f2f2f2',
    },
    reportTd: {
        border: '1px solid #333',
        padding: '8px',
        textAlign: 'center' as 'center',
    },
    welcomeText: { fontFamily: 'serif' },
    sectionTitle: { fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' },
    optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
    checkboxContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem', borderRadius: '6px' },
};

export default ReportModal;