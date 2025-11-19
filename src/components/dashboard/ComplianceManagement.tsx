
import React, { FC, useState, useEffect, useRef } from 'react';
import { styles } from '../../constants';
import { useClinic } from '../../contexts/ClinicContext';
import { ICONS } from '../../pages/AuthPage';

interface ComplianceManagementProps {
    view: 'guide' | 'generator';
}

const ComplianceManagement: FC<ComplianceManagementProps> = ({ view }) => {
    const { clinic } = useClinic();
    const [noticeData, setNoticeData] = useState({
        clinicName: '',
        clinicAddress: '',
        contactEmail: '',
        updateDate: '15 de OCT de 2025'
    });
    const [isDownloading, setIsDownloading] = useState(false);
    const noticeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (clinic) {
            setNoticeData(prev => ({
                ...prev,
                clinicName: clinic.name || '',
                clinicAddress: clinic.address || '',
                contactEmail: clinic.email || 'correo@ejemplo.com'
            }));
        }
    }, [clinic]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNoticeData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrint = () => {
        const printableElement = noticeRef.current;
        const printWindow = window.open('', '_blank');
        if (printWindow && printableElement) {
            printWindow.document.write('<html><head><title>Aviso de Privacidad</title>');
            printWindow.document.write('<style> body { font-family: "Times New Roman", Times, serif; color: #000; margin: 2cm; } h2 { font-size: 14pt; margin-top: 1.5rem; margin-bottom: 0.5rem; } h3 { font-size: 12pt; margin-top: 1rem; } ul { padding-left: 20px; } p, li { font-size: 11pt; line-height: 1.5; text-align: justify; } </style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printableElement.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleDownloadPdf = async () => {
        const element = noticeRef.current;
        if (!element) return;
    
        setIsDownloading(true);
    
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Times New Roman', serif; color: #000; background-color: #fff; padding: 40px; }
                        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
                        h3 { font-size: 14px; margin-top: 15px; margin-bottom: 5px; font-weight: bold; }
                        p, li { font-size: 12px; line-height: 1.5; text-align: justify; }
                        ul { padding-left: 20px; }
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
                    filename: `Aviso_de_Privacidad_${noticeData.clinicName.replace(/\s/g, "_")}.pdf`
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falló la generación del PDF.');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Aviso_de_Privacidad_${noticeData.clinicName.replace(/\s/g, "_")}.pdf`;
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

    // Styles for the generator preview (internal look)
    const noticeTextStyle: React.CSSProperties = { color: '#000', lineHeight: 1.6, fontSize: '11pt', fontFamily: '"Times New Roman", Times, serif', margin: '0 0 1rem 0', textAlign: 'justify' };
    const noticeH2Style: React.CSSProperties = { ...noticeTextStyle, fontWeight: 'bold', fontSize: '12pt', marginTop: '1.5rem', marginBottom: '0.5rem', textAlign: 'left' };
    
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    };

    const inputStyle: React.CSSProperties = {
        ...styles.input,
        backgroundColor: 'var(--background-color)',
        borderColor: 'var(--border-color)',
        marginBottom: 0
    };

    const renderGenerator = () => (
        <div className="fade-in">
            <section style={cardStyle}>
                <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <span style={{fontSize: '1.5rem', color: 'var(--primary-color)'}}>{ICONS.file}</span>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>Generador de Aviso de Privacidad</h3>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>Personaliza la plantilla oficial para tu clínica.</p>
                    </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem'}}>
                    <div>
                        <label style={styles.label}>Nombre de la Clínica</label>
                        <input name="clinicName" value={noticeData.clinicName} onChange={handleChange} placeholder="[Nombre de la Clínica]" style={inputStyle} />
                    </div>
                     <div>
                        <label style={styles.label}>Email para Derechos ARCO</label>
                        <input name="contactEmail" type="email" value={noticeData.contactEmail} onChange={handleChange} placeholder="[email@ejemplo.com]" style={inputStyle} />
                    </div>
                    <div>
                        <label style={styles.label}>Fecha de Actualización</label>
                        <input name="updateDate" value={noticeData.updateDate} onChange={handleChange} placeholder="15 de OCT de 2025" style={inputStyle} />
                    </div>
                    <div style={{gridColumn: '1 / -1'}}>
                        <label style={styles.label}>Dirección Completa</label>
                        <input name="clinicAddress" value={noticeData.clinicAddress} onChange={handleChange} placeholder="[Dirección de la Clínica]" style={inputStyle} />
                    </div>
                </div>

                <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                    <button onClick={handlePrint} className="button-secondary">{ICONS.print} Imprimir</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? 'Generando...' : <>{ICONS.download} Descargar PDF</>}
                    </button>
                </div>
            </section>
            
            <div style={{backgroundColor: '#525659', padding: '2rem', borderRadius: '12px', display: 'flex', justifyContent: 'center'}}>
                <div id="printable-area" ref={noticeRef} style={{backgroundColor: '#fff', color: '#000', padding: '2.5cm 2cm', width: '21cm', minHeight: '29.7cm', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'}}>
                    <p style={{...noticeTextStyle, textAlign: 'right', fontStyle: 'italic', fontSize: '10pt'}}>Aviso de Privacidad Simplificado Actualizado a {noticeData.updateDate || '[Fecha]'}.</p>
                    
                    <p style={noticeTextStyle}>
                        <strong>{noticeData.clinicName || '[Nombre de la Clínica]'}</strong>, con domicilio en <strong>{noticeData.clinicAddress || '[Dirección de la Clínica]'}</strong>, es la entidad responsable del uso, protección y tratamiento de sus datos personales, en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
                    </p>

                    <h2 style={noticeH2Style}>1. Finalidades del Tratamiento de Datos Personales.</h2>
                    <h3 style={{...noticeH2Style, fontSize: '11pt', marginTop: '1rem'}}>A. Finalidades Primarias Esenciales.</h3>
                    <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                        <li>Integrar debidamente su expediente clínico nutricional conforme a la NOM-004-SSA3-2012.</li>
                        <li>Realizar una evaluación completa de su estado de salud y nutrición.</li>
                        <li>Diseñar y elaborar planes de alimentación y ejercicio personalizados.</li>
                        <li>Dar seguimiento sistemático a su progreso para realizar los ajustes pertinentes.</li>
                        <li>Gestionar la comunicación para agendar, confirmar o cancelar citas.</li>
                    </ul>
                    <h3 style={{...noticeH2Style, fontSize: '11pt', marginTop: '1rem'}}>B. Finalidades Secundarias.</h3>
                    <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                        <li>Realizar análisis estadísticos internos para mejorar la calidad del servicio.</li>
                        <li>Enviar material educativo y promociones (si aplica).</li>
                    </ul>
                    <p style={noticeTextStyle}>Si no desea que sus datos se usen para fines secundarios, puede manifestarlo enviando un correo a <strong>{noticeData.contactEmail || '[email@ejemplo.com]'}</strong>.</p>

                    <h2 style={noticeH2Style}>2. Datos Personales Sometidos a Tratamiento</h2>
                    <p style={noticeTextStyle}>
                        Utilizaremos los siguientes datos, algunos considerados sensibles por la LFPDPPP:
                    </p>
                    <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                        <li><strong>Identificación y contacto:</strong> Nombre, dirección, teléfono, email, CURP.</li>
                        <li><strong>Datos sensibles de salud:</strong> Historial clínico, antecedentes heredofamiliares, alergias, resultados de laboratorio y medicamentos.</li>
                        <li><strong>Datos antropométricos:</strong> Peso, talla, IMC y hábitos de estilo de vida.</li>
                    </ul>

                    <h2 style={noticeH2Style}>3. Transferencia de Datos</h2>
                    <p style={noticeTextStyle}>Sus datos no serán transferidos a terceros sin su consentimiento expreso, salvo las excepciones previstas en el artículo 37 de la LFPDPPP (ej. requerimientos de autoridad competente).</p>

                    <h2 style={noticeH2Style}>4. Derechos ARCO y Revocación</h2>
                    <p style={noticeTextStyle}>
                        Usted tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>, <strong>Cancelar</strong> u <strong>Oponerse</strong> al tratamiento de sus datos (Derechos ARCO). Para ejercerlos, envíe una solicitud a <strong>{noticeData.contactEmail || '[email@ejemplo.com]'}</strong> acreditando su identidad.
                    </p>

                    <h2 style={noticeH2Style}>5. Consentimiento Expreso</h2>
                    <p style={noticeTextStyle}>Al firmar este documento, otorgo mi consentimiento expreso para que mis datos personales y sensibles sean tratados conforme a los términos aquí establecidos.</p>
                    
                    <div style={{marginTop: '3cm', display: 'flex', justifyContent: 'space-between', color: '#000'}}>
                        <div style={{textAlign: 'center', width: '40%'}}>
                            <div style={{borderTop: '1px solid #000', height: '1px', width: '100%'}}></div>
                            <p style={{marginTop: '5px', fontSize: '10pt'}}>Firma del Paciente</p>
                        </div>
                        <div style={{textAlign: 'center', width: '40%'}}>
                            <div style={{borderTop: '1px solid #000', height: '1px', width: '100%'}}></div>
                            <p style={{marginTop: '5px', fontSize: '10pt'}}>Nombre y Firma del Responsable</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderGuide = () => (
        <div className="fade-in">
            <section style={cardStyle}>
                <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <span style={{fontSize: '1.5rem', color: 'var(--primary-color)'}}>{ICONS.book}</span>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>Guía de Cumplimiento Normativo (México)</h3>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>Referencias clave para la LFPDPPP, NOM-004 y NOM-024.</p>
                    </div>
                </div>

                <div style={{display: 'grid', gap: '2rem'}}>
                    <div>
                        <h4 style={{color: 'var(--primary-color)', fontSize: '1rem', marginBottom: '0.5rem'}}>🔐 Confidencialidad e Integridad</h4>
                        <p style={{fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: 1.6, margin: 0}}>
                            El sistema protege la titularidad y confidencialidad del expediente clínico nutricional. Garantiza el ejercicio pleno de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) y asegura la disponibilidad de los datos mediante respaldos automáticos, minimizando riesgos legales y sanitarios.
                        </p>
                    </div>

                    <div>
                        <h4 style={{color: 'var(--primary-color)', fontSize: '1rem', marginBottom: '0.5rem'}}>⚖️ Gestión de Derechos ARCO</h4>
                        <ul style={{paddingLeft: '1.25rem', margin: 0, fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: 1.6}}>
                            <li style={{marginBottom: '0.5rem'}}><strong>Acceso:</strong> La función "Exportar Datos (JSON)" permite al paciente obtener una copia estructurada de su información (Portabilidad NOM-024).</li>
                            <li style={{marginBottom: '0.5rem'}}><strong>Rectificación:</strong> Los formularios de edición permiten mantener el expediente veraz y actualizado.</li>
                            <li><strong>Cancelación/Oposición:</strong> La opción de eliminar paciente bloquea el uso de los datos, manteniéndolos solo para cumplimiento legal por el periodo obligatorio (5 años según NOM-004).</li>
                        </ul>
                    </div>

                    <div>
                        <h4 style={{color: 'var(--primary-color)', fontSize: '1rem', marginBottom: '0.5rem'}}>📋 Normas Oficiales Mexicanas (NOM)</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div style={{backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                <strong style={{color: 'var(--text-color)'}}>NOM-004-SSA3-2012</strong>
                                <p style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0', color: 'var(--text-light)'}}>
                                    Expediente Clínico. Requiere carta de consentimiento informado y aviso de privacidad firmado para el manejo de datos sensibles.
                                </p>
                            </div>
                            <div style={{backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                <strong style={{color: 'var(--text-color)'}}>NOM-024-SSA3-2012</strong>
                                <p style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0', color: 'var(--text-light)'}}>
                                    Sistemas de Registro Electrónico. Exige trazabilidad (auditoría) de quién accedió o modificó el expediente y cuándo.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#B91C1C', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', gap: '1rem', alignItems: 'start'}}>
                    <span style={{fontSize: '1.5rem'}}>⚠️</span>
                    <div>
                        <strong style={{display: 'block', marginBottom: '0.25rem'}}>Aviso Legal Importante</strong>
                        <p style={{margin: 0, fontSize: '0.9rem'}}>
                            Esta plataforma facilita el cumplimiento normativo pero no sustituye la asesoría legal. Es responsabilidad del profesional de la salud asegurar la adhesión a todas las leyes vigentes. El incumplimiento puede derivar en sanciones administrativas o penales.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {view === 'generator' && renderGenerator()}
            {view === 'guide' && renderGuide()}
        </div>
    );
};

export default ComplianceManagement;
