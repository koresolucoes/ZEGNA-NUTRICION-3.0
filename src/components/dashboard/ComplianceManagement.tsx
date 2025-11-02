

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
            printWindow.document.write('<style> body { font-family: Times, serif; color: #000; margin: 2cm; } h2, h3 { margin-top: 1rem; margin-bottom: 0.5rem; } ul { padding-left: 20px; } </style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printableElement.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    const handleDownloadPdf = async () => {
        const element = noticeRef.current;
        if (!element) return;
    
        setIsDownloading(true);
    
        try {
            // Get the live styles from the document to pass them to the PDF generator
            const mainStyles = document.querySelector('style')?.innerHTML || '';
            
            // Construct a full HTML document string
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
                    <style>
                        body { font-family: 'Inter', sans-serif; color: #000; background-color: #fff; }
                        /* Add specific styles for the PDF content here */
                        ${mainStyles}
                        /* Override root variables for PDF context */
                        :root {
                            --primary-color: #007BFF;
                            --text-color: #000;
                            --text-light: #555;
                        }
                        #printable-area { background-color: white !important; color: black !important; }
                        .avoid-break { page-break-inside: avoid; }
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
                    filename: `Aviso_de_Privacidad_${noticeData.clinicName.replace(/\s/g, "_")}.pdf`
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

    const noticeTextStyle: React.CSSProperties = { color: '#000', lineHeight: 1.6, fontSize: '11pt', fontFamily: 'Times, serif', margin: '0 0 1rem 0' };
    const noticeH2Style: React.CSSProperties = { ...noticeTextStyle, fontWeight: 'bold', fontSize: '12pt', marginTop: '1rem', marginBottom: '0.5rem' };
    
    // New styles for the guide
    const guideSectionStyle: React.CSSProperties = {
        padding: '1.5rem',
        backgroundColor: 'var(--surface-color)',
        borderRadius: '12px',
        marginTop: '1.5rem',
    };
    const guideTextStyle: React.CSSProperties = {
        color: 'var(--text-light)',
        lineHeight: 1.7,
        fontSize: '1rem',
    };
    const guideH2Style: React.CSSProperties = {
        color: 'var(--primary-color)',
        fontSize: '1.2rem',
        marginTop: '2rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
    };
    const guideH3Style: React.CSSProperties = {
        color: 'var(--accent-color)',
        fontSize: '1.1rem',
        marginTop: '1.5rem',
        marginBottom: '0.5rem',
    };

    const renderGenerator = () => (
        <section style={{
            padding: '1.5rem',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '12px',
            marginTop: '1.5rem',
        }} className="fade-in">
            <h2 style={{marginTop: 0}}>Generador de Aviso de Privacidad</h2>
            <p style={{color: 'var(--text-light)'}}>
                Rellena los datos de tu clínica para personalizar la plantilla del Aviso de Privacidad Simplificado. Después, podrás imprimirlo o descargarlo en PDF.
            </p>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
                <div>
                    <label>Nombre de la Clínica</label>
                    <input name="clinicName" value={noticeData.clinicName} onChange={handleChange} placeholder="[Nombre de la Clínica]" />
                </div>
                 <div>
                    <label>Email para Derechos ARCO</label>
                    <input name="contactEmail" type="email" value={noticeData.contactEmail} onChange={handleChange} placeholder="[email@ejemplo.com]" />
                </div>
                <div>
                    <label>Fecha de Actualización</label>
                    <input name="updateDate" value={noticeData.updateDate} onChange={handleChange} placeholder="15 de OCT de 2025" />
                </div>
                <div style={{gridColumn: '1 / -1'}}>
                    <label>Dirección</label>
                    <input name="clinicAddress" value={noticeData.clinicAddress} onChange={handleChange} placeholder="[Dirección de la Clínica]" />
                </div>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                <button onClick={handlePrint}>{ICONS.print} Imprimir</button>
                <button onClick={handleDownloadPdf} disabled={isDownloading} className="button-secondary">
                    {isDownloading ? 'Generando...' : <>{ICONS.download} Descargar PDF</>}
                </button>
            </div>
            
            <div id="printable-area" ref={noticeRef} style={{backgroundColor: '#fff', color: '#000', padding: '2rem', borderRadius: '8px'}}>
                <p style={{...noticeTextStyle, textAlign: 'right', fontStyle: 'italic'}}>Aviso de Privacidad Simplificado Actualizado a {noticeData.updateDate || '[Fecha]'}.</p>
                <p style={noticeTextStyle}>
                    <strong>{noticeData.clinicName || '[Nombre de la Clínica]'}</strong>, con domicilio en <strong>{noticeData.clinicAddress || '[Dirección de la Clínica]'}</strong>, es la entidad responsable del uso, protección y tratamiento de sus datos personales, en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
                </p>

                <h2 style={noticeH2Style}>1. Finalidades del Tratamiento de Datos Personales Para la Prestación del Servicio.</h2>
                <h3 style={{...noticeH2Style, fontSize: '11pt'}}>A. Finalidades Primarias Esenciales Para la Prestación del Servicio.</h3>
                <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                    <li>Integrar debidamente su expediente clínico nutricional.</li>
                    <li>Realizar una evaluación completa de su estado de salud y nutrición.</li>
                    <li>Diseñar y elaborar planes de alimentación y ejercicio completamente personalizados.</li>
                    <li>Dar seguimiento sistemático a su progreso para realizar los ajustes pertinentes en el tratamiento.</li>
                    <li>Gestionar la comunicación para agendar, confirmar, modificar o cancelar citas.</li>
                </ul>
                <h3 style={{...noticeH2Style, fontSize: '11pt'}}>B. Finalidades Secundarias No Esenciales Para la Prestación del Servicio.</h3>
                <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                    <li>Realizar análisis estadísticos e investigaciones internas con el fin de mejorar la calidad de nuestros servicios.</li>
                    <li>Enviar comunicaciones con fines informativos, material educativo y promociones relacionadas con nuestros servicios de nutrición.</li>
                    <li>En caso de que no desee que sus datos personales sean tratados para estos fines secundarios, puede manifestar su oposición enviando un correo a <strong>{noticeData.contactEmail || '[email@ejemplo.com]'}</strong> a partir de este momento.</li>
                </ul>

                <h2 style={noticeH2Style}>2. Datos Personales que serán Sometidos a Tratamiento</h2>
                <p style={noticeTextStyle}>
                    Para llevar a cabo las finalidades descritas en este aviso, utilizaremos los siguientes datos personales, algunos de los cuales se consideran sensibles conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP):
                </p>
                <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                    <li><strong>Datos de identificación y contacto:</strong> Nombre completo, dirección, teléfono (fijo y/o móvil) y correo electrónico.</li>
                    <li><strong>Datos de salud:</strong> Historial clínico, padecimientos actuales o pasados, alergias y resultados de laboratorio, medicamentos que utiliza y cualquier otra información relevante para la evaluación de su estado de salud.</li>
                    <li><strong>Datos antropométricos y de estilo de vida:</strong> peso, altura, mediciones coorporales, índice de masa corporal (IMC) hábitos alimenticios, patrones de actividad física y preferencias alimenticias.</li>
                </ul>

                <h2 style={noticeH2Style}>3. Transferencia de Datos Personales</h2>
                <p style={noticeTextStyle}>Le informamos que sus datos personales no serán transferidos a terceros sin su consentimiento expreso, salvo en los casos previstos por el artículo 37 de la LFPDPPP, como requerimientos de autoridades competentes debidamente fundados y motivados.</p>

                <h2 style={noticeH2Style}>4. Medios para Ejercer los Derechos ARCO y Revocación del Consentimiento</h2>
                <p style={noticeTextStyle}>
                    Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del tratamiento que les damos (Acceso). Asimismo, puede solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); solicitar que la eliminemos de nuestros registros o bases de datos cuando considere que no se está utilizando adecuadamente (Cancelación); o oponerse al uso de sus datos para fines específicos (Oposición). Estos derechos se denominan derechos ARCO.
                </p>
                <p style={noticeTextStyle}>
                    Para ejercer cualquiera de los derechos ARCO o para revocar su consentimiento, deberá presentar la solicitud respectiva a través del correo electrónico <strong>{noticeData.contactEmail || '[email@ejemplo.com]'}</strong>.
                </p>
                <p style={noticeTextStyle}>Su solicitud deberá contener:</p>
                <ul style={{...noticeTextStyle, paddingLeft: '20px'}}>
                    <li>Nombre completo del titular.</li>
                    <li>Documento que acredite su identidad.</li>
                    <li>Descripción clara y precisa de los datos respecto de los que se busca ejercer alguno de los derechos mencionados.</li>
                </ul>
                <p style={noticeTextStyle}>Nuestro equipo se comunicará con usted dos días hábiles después de la fecha de contacto para informarle sobre el estado de su solicitud. La resolución de su solicitud se llevará a cabo dentro de los quince días hábiles siguientes a la fecha en que se emita la respuesta.</p>

                <h2 style={noticeH2Style}>5. Modificaciones al Aviso de Privacidad</h2>
                <p style={noticeTextStyle}>Este aviso de privacidad puede ser modificado, cambiado o actualizado debido a nuevos requerimientos legales o por decisión de la clínica. Nos comprometemos a informarle sobre cualquier cambio a través de su correo electrónico registrado o mediante un aviso visible en nuestras instalaciones.</p>
                
                <h2 style={noticeH2Style}>6. Consentimiento para el Tratamiento de Datos Personales</h2>
                <p style={noticeTextStyle}>Declaro que he leído y entiendo el presente Aviso de Privacidad y otorgo mi consentimiento expreso para el tratamiento de mis datos personales, incluyendo los sensibles, en los términos aquí establecidos.</p>
                
                <div style={{marginTop: '4rem', display: 'flex', justifyContent: 'space-around', color: '#000'}}>
                    <div style={{textAlign: 'center', width: '250px'}}><p style={{borderTop: '1px solid #000', paddingTop: '0.5rem', margin: 0}}>Firma del Paciente</p></div>
                    <div style={{textAlign: 'center', width: '250px'}}><p style={{borderTop: '1px solid #000', paddingTop: '0.5rem', margin: 0}}>Firma del Responsable</p></div>
                </div>

            </div>
        </section>
    );

    const renderGuide = () => (
        <section style={guideSectionStyle} className="fade-in">
            <h2 style={{...guideH2Style, marginTop: 0}}>Guía Integral de Cumplimiento Normativo para Profesionales de la Salud en México</h2>
            <p style={guideTextStyle}>
                Esta sección ofrece recursos, herramientas y orientaciones prácticas para asegurar el cumplimiento de la Ley 
                Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)  y las Normas Oficiales 
                Mexicanas (NOM) pertinentes al expediente clínico electrónico, especificamente la NOM-004-SSA3-2012 
                (Expediente Clínico) y la NOM-024-SSA3-2012 (Sistemas de Información de Registro Electrónico para la 
                Salud). El proposito fundamental es fomentar la integridad, confidencialidad y disponibilidad de los datos de 
                salud, minimizando asi los riesgos legales y sanitarios asociados.
            </p>

            <h3 style={guideH3Style}>Confidencialidad e Integridad del Sistema</h3>
            <p style={guideTextStyle}>
                El sistema ha sido diseñado para facilitar el cumplimiento de  los derechos de los pacientes y las normativas 
                mexicanas vigentes, garantizando el ejercicio pleno de los derechos ARCO (Acceso, Rectificación, Cancelación 
                y Oposición). Ademas, el sistema protege la titularidad y confidencialidad del expediente clínico nutricional, 
                simplifica la generacion de reportes automáticos para inspecciones y reduce la probabilidad de incurrir  en 
                multas por violaciones a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares 
                (LFPDPPP).
            </p>

            <h2 style={guideH2Style}>Gestión de Derechos (ARCO)</h2>
            <p style={guideTextStyle}>
                Facilitamos el cumplimiento de los derechos de tus pacientes con acciones intuitivas, garantizando el pleno 
                ejercicio de acceso, rectificación, cancelación y oposición en todo momento de una forma segura y precisa.
            </p>
            <h3 style={guideH3Style}>Acceso y Portabilidad de Datos (ARCO)</h3>
            <p style={guideTextStyle}>
                Con la función "Exportar Expediente (JSON)", el paciente puede obtener una copia completa de su 
                información en un formato seguro y estructurado. Esto no solo cumple con el derecho de Acceso, sino que 
                también asegura la portabilidad de datos para la continuidad de su atención conforme lo establece la NOM-024- SSA3-2012.
            </p>
            <h3 style={guideH3Style}>Rectificación Precisa (ARCO)</h3>
            <p style={guideTextStyle}>
                La plataforma te permite modificar la información proporcionada del paciente directamente desde sus 
                formularios correspondientes. Esto garantiza que el expediente clínico se mantenga siempre actualizado y 
                veraz, sin comprometer su integridad histórica, esto en cumpliento con la gestion de los derechos ARCO.
            </p>
            <h3 style={guideH3Style}>Cancelación y Oposición (ARCO)</h3>
            <p style={guideTextStyle}>
                Las acciones "Eliminar Paciente" y "Revocar Consentimiento" eliminaran de forma permanente los datos en el 
                sistema asegurando que su informacion ya no sea tratada, conforme la gestion de los derechos ARCO. Para 
                cumplir con la Ley General de Salud, se aísla una copia del expediente bloqueando su uso, pero conservándolo 
                por el periodo mínimo obligatorio de 5 años para los fines que se jusifican su conservacion.
            </p>

            <h2 style={guideH2Style}>Cumplimiento Normativo (NOM)</h2>
            <p style={guideTextStyle}>
                Más allá de los derechos ARCO, la plataforma integra los requisitos clave de las Normas Oficiales Mexicanas y 
                autoridades sanitarias.
            </p>
            <h3 style={guideH3Style}>El Consentimiento Informado (NOM-004)</h3>
            <p style={guideTextStyle}>
                Al firmar el aviso de privacidad, el paciente autoriza el uso de sus datos personales para su tratamiento. Este 
                acto se registra con fecha y hora, proporcionando evidencia auditable del cumplimiento ético y normativo en el 
                manejo de información sensible.
            </p>
            <h3 style={guideH3Style}>Trazabilidad y Auditoría (NOM-024)</h3>
            <p style={guideTextStyle}>
                Cada creación o modificación en un expediente genera una entrada automática en la bitácora del paciente. Este 
                registro indica qué usuario realizó la acción y cuándo, cumpliendo con el principio de trazabilidad y garantizando 
                la integridad del expediente clínico conforme la NOM-024-SSA3-2012.
            </p>
            <h3 style={guideH3Style}>Cumplimiento con Requisitos Sanitarios COFEPRIS</h3>
            <p style={guideTextStyle}>
                La estructura de la plataforma está alineada con las regulaciones de COFEPRIS para sistemas de salud 
                nutricional. Esto tiene como objetivo facilitar las visitas de verificación y demostrar el cumplimiento ante las 
                autoridades regulatorias.
            </p>
            
            <div style={{marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderRadius: '8px', border: '1px solid var(--error-color)'}}>
                <p style={{margin:0, fontWeight: 600}}>Aviso Importante</p>
                <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}>
                    Esta plataforma es una potente herramienta de apoyo diseñada para el cumplimiento 
                    normativo. Sin embargo, no sustituye la asesoría legal especializada. Es su responsabilidad como profesional 
                    de la salud asegurar la adhesión a todas las normativas vigentes.  
                    Recuerde que el incumplimiento puede derivar en sanciones administrativas o penales, conforme a la Ley 
                    General de Salud y regulaciones afines.
                </p>
            </div>
        </section>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
            {view === 'generator' && renderGenerator()}
            {view === 'guide' && renderGuide()}
        </div>
    );
};

export default ComplianceManagement;