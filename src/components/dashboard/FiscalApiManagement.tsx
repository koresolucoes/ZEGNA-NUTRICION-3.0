import React, { FC, useState, useEffect, FormEvent } from 'react';
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
                // Don't fetch password, it's write-only from the client
                setIsEditing(false); // Start in view mode if credentials exist
            } else {
                setIsEditing(true); // Start in edit mode if no credentials exist
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

            // Upload certificate if a new one is provided
            if (certificateFile) {
                const newCertPath = `${clinic.id}/certificate.cer`;
                const { error: uploadError } = await supabase.storage
                    .from('fiscal-files')
                    .upload(newCertPath, certificateFile, { upsert: true });
                if (uploadError) throw new Error(`Error al subir el certificado: ${uploadError.message}`);
                certPath = newCertPath;
            }
            
            // Upload private key if a new one is provided
            if (privateKeyFile) {
                const newKeyPath = `${clinic.id}/private_key.key`;
                const { error: uploadError } = await supabase.storage
                    .from('fiscal-files')
                    .upload(newKeyPath, privateKeyFile, { upsert: true });
                if (uploadError) throw new Error(`Error al subir la clave privada: ${uploadError.message}`);
                keyPath = newKeyPath;
            }

            // Call the secure serverless function to save paths and encrypt the password
            const response = await fetch('/api/save-fiscal-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic.id,
                    certificate_path: certPath,
                    private_key_path: keyPath,
                    private_key_password: privateKeyPassword || null, // Send null if empty
                    environment: environment,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falló la operación de guardado.');

            setSuccess('Credenciales guardadas con éxito.');
            setIsEditing(false);
            // Reset input fields after successful save
            setPrivateKeyPassword('');
            setCertificateFile(null);
            setPrivateKeyFile(null);
            setDbCredentials(prev => ({...prev, certificate_path: certPath, private_key_path: keyPath, id: 'temp-id'})); // Update state to reflect saved data

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
    
    const successMessageStyle: React.CSSProperties = { ...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)' };

    if (loading) {
        return <p>Cargando configuración de facturación...</p>;
    }

    return (
        <div style={{ maxWidth: '700px', marginTop: '1.5rem' }}>
            <h2>Integración de Facturación (FiscalAPI)</h2>
            <p style={{ color: 'var(--text-light)' }}>
                Conecta tu e.firma (Certificado, Clave Privada y Contraseña) para emitir facturas (CFDI) a tu nombre directamente desde la plataforma. 
                El sistema utiliza su propia clave de FiscalAPI, por lo que no necesitas una.
            </p>

            <form onSubmit={handleSave}>
                {error && <p style={styles.error}>{error}</p>}
                {success && <p style={successMessageStyle}>{success}</p>}

                <label htmlFor="environment">Ambiente de FiscalAPI</label>
                <select id="environment" name="environment" value={environment} onChange={e => setEnvironment(e.target.value)} disabled={!isEditing}>
                    <option value="sandbox">Pruebas (Sandbox)</option>
                    <option value="production">Producción (Live)</option>
                </select>

                <label htmlFor="certificate_file">Certificado (.cer)</label>
                {isEditing ? (
                    <input id="certificate_file" name="certificate_file" type="file" accept=".cer" onChange={e => setCertificateFile(e.target.files ? e.target.files[0] : null)} />
                ) : (
                    <p style={styles.readOnlyField}>{dbCredentials.certificate_path ? 'Certificado cargado.' : 'No se ha cargado.'}</p>
                )}


                <label htmlFor="private_key_file">Clave Privada (.key)</label>
                 {isEditing ? (
                    <input id="private_key_file" name="private_key_file" type="file" accept=".key" onChange={e => setPrivateKeyFile(e.target.files ? e.target.files[0] : null)} />
                ) : (
                    <p style={styles.readOnlyField}>{dbCredentials.private_key_path ? 'Clave privada cargada.' : 'No se ha cargado.'}</p>
                )}


                <label htmlFor="private_key_password">Contraseña de la Clave Privada</label>
                <input
                    id="private_key_password"
                    name="private_key_password"
                    type="password"
                    value={privateKeyPassword}
                    onChange={e => setPrivateKeyPassword(e.target.value)}
                    placeholder={isEditing ? 'Introduce la contraseña' : '********'}
                    disabled={!isEditing}
                />
                 {isEditing && <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>Si no quieres actualizar la contraseña, deja este campo en blanco.</small>}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    {isEditing ? (
                        <>
                            <button type="button" onClick={() => setIsEditing(false)} className="button-secondary" disabled={saving}>Cancelar</button>
                            <button type="submit" disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Credenciales'}
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setIsEditing(true)}>
                            {ICONS.edit} Editar Credenciales
                        </button>
                    )}
                </div>
            </form>

            <div style={{marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                <h3>Verificar Conexión</h3>
                <p style={{color: 'var(--text-light)'}}>Usa esta herramienta para generar una factura de prueba en el ambiente "Sandbox" y confirmar que tus credenciales y certificados son correctos.</p>
                {testError && <p style={styles.error}>{testError}</p>}
                {testSuccess && <p style={successMessageStyle}>{testSuccess}</p>}
                <button 
                    type="button" 
                    onClick={handleTestInvoice} 
                    className="button-secondary"
                    disabled={!dbCredentials.id || isEditing || testLoading}
                >
                    {testLoading ? 'Generando...' : 'Generar Factura de Prueba'}
                </button>
            </div>

        </div>
    );
};

export default FiscalApiManagement;