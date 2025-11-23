
import React, { FC, useState, useEffect, FormEvent, useRef } from 'react';
import { supabase } from '../../supabase';
import { useClinic } from '../../contexts/ClinicContext';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FiscalCredentials } from '../../types';

const FiscalApiManagement: FC = () => {
    const { clinic } = useClinic();
    const [dbCredentials, setDbCredentials] = useState<Partial<FiscalCredentials>>({});
    const [environment, setEnvironment] = useState('sandbox');
    const [privateKeyPassword, setPrivateKeyPassword] = useState('');
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // State for test invoice functionality
    const [testLoading, setTestLoading] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [testSuccess, setTestSuccess] = useState<string | null>(null);

    // Refs for file inputs
    const certInputRef = useRef<HTMLInputElement>(null);
    const keyInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchCredentials = async () => {
            if (!clinic) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('fiscal_credentials')
                .select('*')
                .eq('clinic_id', clinic.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                setError(error.message);
            } else if (data) {
                setDbCredentials(data);
                setEnvironment(data.environment || 'sandbox');
                setIsEditing(false);
            } else {
                setIsEditing(true);
            }
            setLoading(false);
        };
        fetchCredentials();
    }, [clinic]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            let certPath = dbCredentials.certificate_path;
            let keyPath = dbCredentials.private_key_path;

            if (certificateFile) {
                const newCertPath = `${clinic.id}/certificate.cer`;
                const { error: uploadError } = await supabase.storage
                    .from('fiscal-files')
                    .upload(newCertPath, certificateFile, { upsert: true });
                if (uploadError) throw new Error(`Error al subir el certificado: ${uploadError.message}`);
                certPath = newCertPath;
            }
            
            if (privateKeyFile) {
                const newKeyPath = `${clinic.id}/private_key.key`;
                const { error: uploadError } = await supabase.storage
                    .from('fiscal-files')
                    .upload(newKeyPath, privateKeyFile, { upsert: true });
                if (uploadError) throw new Error(`Error al subir la clave privada: ${uploadError.message}`);
                keyPath = newKeyPath;
            }

            const response = await fetch('/api/save-fiscal-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic.id,
                    certificate_path: certPath,
                    private_key_path: keyPath,
                    private_key_password: privateKeyPassword || null,
                    environment: environment,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falló la operación de guardado.');

            setSuccess('Credenciales guardadas y validadas con éxito.');
            setIsEditing(false);
            setPrivateKeyPassword('');
            setCertificateFile(null);
            setPrivateKeyFile(null);
            setDbCredentials(prev => ({...prev, certificate_path: certPath, private_key_path: keyPath, id: 'temp-id'}));

        } catch (err: any) {
            setError(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };
    
    const handleTestInvoice = async () => {
        if (!clinic) return;
        setTestLoading(true);
        setTestError(null);
        setTestSuccess(null);
        try {
            const response = await fetch('/api/test-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinic_id: clinic.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falló la generación de la factura de prueba.');
            
            setTestSuccess(`¡Factura de prueba generada con éxito! UUID: ${result.uuid}`);

        } catch (err: any) {
            setTestError(err.message);
        } finally {
            setTestLoading(false);
        }
    };
    
    // Styles
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow)',
        marginBottom: '2rem'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--text-color)'
    };

    const inputStyle: React.CSSProperties = {
        ...styles.input,
        marginBottom: '1.5rem',
        backgroundColor: 'var(--background-color)',
        borderColor: 'var(--border-color)'
    };

    const fileInputContainerStyle = (isActive: boolean, hasFile: boolean): React.CSSProperties => ({
        border: `2px dashed ${hasFile ? 'var(--primary-color)' : 'var(--border-color)'}`,
        borderRadius: '12px',
        padding: '1.5rem',
        textAlign: 'center',
        cursor: isActive ? 'pointer' : 'default',
        backgroundColor: hasFile ? 'rgba(56, 189, 248, 0.05)' : 'var(--surface-hover-color)',
        transition: 'all 0.2s',
        marginBottom: '1.5rem',
        opacity: isActive ? 1 : 0.7
    });

    if (loading) {
        return <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-light)'}}>Cargando configuración de facturación...</div>;
    }

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                <p style={{ color: 'var(--text-light)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                    Conecta tu <strong>e.firma (FIEL)</strong> para habilitar la emisión automática de facturas (CFDI 4.0). Tus claves se almacenan de forma segura y encriptada.
                </p>
            </div>

            {/* Main Configuration Card */}
            <div style={cardStyle}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>
                    <h3 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{color: 'var(--primary-color)'}}>{ICONS.briefcase}</span> Credenciales del SAT
                    </h3>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{...styles.iconButton, color: 'var(--primary-color)'}}>
                            {ICONS.edit} Editar
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave}>
                    {error && <div style={{...styles.error, marginBottom: '1.5rem'}}>{error}</div>}
                    {success && <div style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)', marginBottom: '1.5rem'}}>{success}</div>}

                    <div style={{marginBottom: '2rem'}}>
                        <label style={labelStyle}>Ambiente de FiscalAPI</label>
                        <div style={{display: 'flex', gap: '0.5rem', padding: '4px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content'}}>
                            <button
                                type="button"
                                onClick={() => isEditing && setEnvironment('sandbox')}
                                disabled={!isEditing}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: environment === 'sandbox' ? 'var(--surface-color)' : 'transparent',
                                    color: environment === 'sandbox' ? 'var(--primary-color)' : 'var(--text-light)',
                                    fontWeight: 600,
                                    cursor: isEditing ? 'pointer' : 'default',
                                    boxShadow: environment === 'sandbox' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🧪 Sandbox (Pruebas)
                            </button>
                            <button
                                type="button"
                                onClick={() => isEditing && setEnvironment('production')}
                                disabled={!isEditing}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: environment === 'production' ? 'var(--surface-color)' : 'transparent',
                                    color: environment === 'production' ? '#10B981' : 'var(--text-light)',
                                    fontWeight: 600,
                                    cursor: isEditing ? 'pointer' : 'default',
                                    boxShadow: environment === 'production' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🚀 Producción
                            </button>
                        </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                        {/* Certificate Input */}
                        <div>
                            <label style={labelStyle}>Certificado (.cer)</label>
                            <div 
                                style={fileInputContainerStyle(isEditing, !!dbCredentials.certificate_path || !!certificateFile)}
                                onClick={() => isEditing && certInputRef.current?.click()}
                            >
                                <input 
                                    ref={certInputRef}
                                    type="file" 
                                    accept=".cer" 
                                    onChange={e => setCertificateFile(e.target.files ? e.target.files[0] : null)} 
                                    style={{display: 'none'}}
                                    disabled={!isEditing}
                                />
                                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>📄</div>
                                {certificateFile ? (
                                    <span style={{fontWeight: 600, color: 'var(--primary-color)'}}>{certificateFile.name}</span>
                                ) : dbCredentials.certificate_path ? (
                                    <span style={{fontWeight: 600, color: '#10B981'}}>Certificado Activo</span>
                                ) : (
                                    <span style={{color: 'var(--text-light)'}}>Seleccionar archivo</span>
                                )}
                            </div>
                        </div>

                        {/* Private Key Input */}
                        <div>
                            <label style={labelStyle}>Clave Privada (.key)</label>
                            <div 
                                style={fileInputContainerStyle(isEditing, !!dbCredentials.private_key_path || !!privateKeyFile)}
                                onClick={() => isEditing && keyInputRef.current?.click()}
                            >
                                <input 
                                    ref={keyInputRef}
                                    type="file" 
                                    accept=".key" 
                                    onChange={e => setPrivateKeyFile(e.target.files ? e.target.files[0] : null)} 
                                    style={{display: 'none'}}
                                    disabled={!isEditing}
                                />
                                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>🔑</div>
                                {privateKeyFile ? (
                                    <span style={{fontWeight: 600, color: 'var(--primary-color)'}}>{privateKeyFile.name}</span>
                                ) : dbCredentials.private_key_path ? (
                                    <span style={{fontWeight: 600, color: '#10B981'}}>Clave Activa</span>
                                ) : (
                                    <span style={{color: 'var(--text-light)'}}>Seleccionar archivo</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="private_key_password" style={labelStyle}>Contraseña de la Clave Privada</label>
                        <input
                            id="private_key_password"
                            type="password"
                            value={privateKeyPassword}
                            onChange={e => setPrivateKeyPassword(e.target.value)}
                            placeholder={isEditing ? (dbCredentials.private_key_password ? '•••••••• (Dejar vacío para mantener)' : 'Ingresa la contraseña') : '••••••••'}
                            disabled={!isEditing}
                            style={inputStyle}
                        />
                    </div>

                    {isEditing && (
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <button type="button" onClick={() => { setIsEditing(false); setCertificateFile(null); setPrivateKeyFile(null); setPrivateKeyPassword(''); }} className="button-secondary">Cancelar</button>
                            <button type="submit" disabled={saving} style={{minWidth: '150px'}}>
                                {saving ? 'Guardando...' : 'Guardar Credenciales'}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Testing Section */}
            <div style={{...cardStyle, border: '1px dashed var(--border-color)', backgroundColor: 'transparent'}}>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'start'}}>
                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.8rem', borderRadius: '12px', fontSize: '1.5rem'}}>🛠️</div>
                    <div style={{flex: 1}}>
                        <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-color)'}}>Verificar Conexión</h3>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.95rem', lineHeight: 1.6}}>
                            Genera una factura de prueba por $100 MXN a un RFC genérico para confirmar que tus certificados son válidos y que la conexión con el PAC es correcta.
                        </p>
                        
                        {testError && <p style={{...styles.error, marginTop: '1rem'}}>{testError}</p>}
                        {testSuccess && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)', marginTop: '1rem'}}>{testSuccess}</p>}
                        
                        <button 
                            type="button" 
                            onClick={handleTestInvoice} 
                            className="button-secondary"
                            disabled={!dbCredentials.id || isEditing || testLoading}
                            style={{marginTop: '1.5rem'}}
                        >
                            {testLoading ? 'Generando...' : 'Generar Factura de Prueba'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default FiscalApiManagement;
