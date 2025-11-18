import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import ConfirmationModal from '../shared/ConfirmationModal';
import DisplayFormModal from './DisplayFormModal';
import { QueueDisplay } from '../../types';

const DisplayManagement: FC = () => {
    const { clinic } = useClinic();
    const [displays, setDisplays] = useState<QueueDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDisplay, setEditingDisplay] = useState<QueueDisplay | null>(null);
    const [deletingDisplay, setDeletingDisplay] = useState<QueueDisplay | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const publicUrl = `${window.location.origin}/#/fila-virtual`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(publicUrl).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }, (err) => {
            console.error('Failed to copy URL: ', err);
        });
    };

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('queue_displays')
                .select('*')
                .eq('clinic_id', clinic.id);
            if (error) throw error;
            setDisplays(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (display: QueueDisplay) => {
        setEditingDisplay(display);
        setIsModalOpen(true);
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setEditingDisplay(null);
        fetchData();
    };
    
    const handleDeleteConfirm = async () => {
        if (!deletingDisplay) return;
        const { error } = await supabase.from('queue_displays').delete().eq('id', deletingDisplay.id);
        if (error) {
            setError(`Error al eliminar: ${error.message}`);
        } else {
            fetchData();
        }
        setDeletingDisplay(null);
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
            {isModalOpen && (
                <DisplayFormModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingDisplay(null); }}
                    onSave={handleSaveSuccess}
                    displayToEdit={editingDisplay}
                />
            )}
             {deletingDisplay && (
                <ConfirmationModal
                    isOpen={!!deletingDisplay}
                    onClose={() => setDeletingDisplay(null)}
                    onConfirm={handleDeleteConfirm}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar la pantalla "<strong>{deletingDisplay.name}</strong>"? Cualquier dispositivo vinculado deberá ser reconfigurado.</p>}
                />
            )}

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Pantallas de Sala de Espera</h2>
                <p style={{ color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                    Configura las pantallas públicas para gestionar el flujo de pacientes de forma ordenada y profesional.
                </p>
            </div>
            
            {/* URL Banner */}
            <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'var(--surface-color)', 
                borderRadius: '16px', 
                marginBottom: '2.5rem', 
                border: `1px solid var(--border-color)`,
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>🔗 URL Pública de la Sala</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)', maxWidth: '500px' }}>
                    Abre esta dirección en la Smart TV o Tablet de tu recepción. Luego, ingresa el código de vinculación de la pantalla que desees mostrar.
                </p>
                
                <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    alignItems: 'center', 
                    backgroundColor: 'var(--surface-hover-color)', 
                    padding: '0.5rem 0.5rem 0.5rem 1.5rem', 
                    borderRadius: '50px',
                    maxWidth: '100%',
                    width: 'auto'
                }}>
                    <span style={{fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px'}}>
                        {publicUrl}
                    </span>
                    <button 
                        type="button" 
                        onClick={handleCopyUrl} 
                        style={{
                            borderRadius: '50px',
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            backgroundColor: copySuccess ? '#10B981' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            fontWeight: 600
                        }}
                    >
                        {copySuccess ? '¡Copiado!' : 'Copiar'}
                    </button>
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                 <h3 style={{margin: 0, fontSize: '1.2rem'}}>Mis Pantallas</h3>
                 <button onClick={() => { setEditingDisplay(null); setIsModalOpen(true); }} className="button-primary">
                    {ICONS.add} Nueva Pantalla
                </button>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>Cargando pantallas...</div>}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {displays.map(display => (
                        <div key={display.id} style={{ 
                            backgroundColor: 'var(--surface-color)', 
                            borderRadius: '16px', 
                            border: '1px solid var(--border-color)',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }} className="card-hover">
                            <div style={{position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', backgroundColor: 'var(--surface-hover-color)', borderBottomLeftRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)'}}>
                                {display.calling_label}
                            </div>

                            <h4 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)'}}>{display.name}</h4>
                            
                            <div style={{margin: '1.5rem 0', textAlign: 'center'}}>
                                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Código de Vinculación</p>
                                <div style={{fontSize: '2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', letterSpacing: '4px'}}>
                                    {display.display_code}
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button onClick={() => handleEdit(display)} style={{flex: 1}} className="button-secondary">Editar</button>
                                <button onClick={() => setDeletingDisplay(display)} style={{padding: '0.6rem 1rem', color: 'var(--error-color)'}} className="button-secondary">{ICONS.delete}</button>
                            </div>
                        </div>
                    ))}
                    
                    {displays.length === 0 && (
                         <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-light)' }}>
                            <p>No hay pantallas configuradas.</p>
                         </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DisplayManagement;