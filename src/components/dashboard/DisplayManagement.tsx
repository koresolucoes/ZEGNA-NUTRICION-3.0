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
            setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
        }, (err) => {
            console.error('Failed to copy URL: ', err);
            // Optionally, show an error message to the user
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
        fetchData(); // Refetch data after save
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
        <div className="fade-in" style={{ maxWidth: '800px' }}>
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

            <section>
                <h2>Gestionar Pantallas de Sala de Espera</h2>
                <p style={{color: 'var(--text-light)'}}>Crea y administra las pantallas públicas donde tus pacientes verán la fila de espera. Cada pantalla tiene un código único para vincularla a un dispositivo (TV, tablet, etc.).</p>
                
                <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', marginBottom: '1.5rem', border: `1px solid var(--border-color)` }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--primary-color)' }}>URL de la Sala de Espera Pública</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        Usa esta dirección en el navegador de tu Smart TV o tablet para mostrar la sala de espera. Luego, ingresa el código de vinculación de la pantalla correspondiente.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            readOnly 
                            value={publicUrl}
                            style={{ flex: 1, margin: 0, backgroundColor: 'var(--background-color)', cursor: 'text' }} 
                        />
                        <button type="button" onClick={handleCopyUrl} className="button-secondary">
                            {copySuccess ? '¡Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>

                <button onClick={() => { setEditingDisplay(null); setIsModalOpen(true); }} style={{marginBottom: '1.5rem'}}>
                    {ICONS.add} Nueva Pantalla
                </button>

                {loading && <p>Cargando pantallas...</p>}
                {error && <p style={styles.error}>{error}</p>}
                
                {!loading && displays.length > 0 && (
                    <div className="info-grid">
                        {displays.map(display => (
                            <div key={display.id} className="info-card">
                                <div style={{flex: 1}}>
                                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)'}}>{display.name}</h4>
                                    <p style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '2px', fontFamily: 'monospace'}}>{display.display_code}</p>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>Texto de llamada: <strong style={{color: 'var(--text-color)'}}>{display.calling_label}</strong></p>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => handleEdit(display)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => setDeletingDisplay(display)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {!loading && displays.length === 0 && (
                    <p>No has configurado ninguna pantalla de sala de espera.</p>
                 )}
            </section>
        </div>
    );
};

export default DisplayManagement;