import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { Service } from '../../types';
import ConfirmationModal from '../shared/ConfirmationModal';
import ServiceFormModal from './ServiceFormModal';

interface ServiceManagementProps {
    navigate: (page: string, context?: any) => void;
}

const ServiceManagement: FC<ServiceManagementProps> = ({ navigate }) => {
    const { clinic } = useClinic();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deletingService, setDeletingService] = useState<Service | null>(null);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('clinic_id', clinic.id)
                .order('name');
            if (error) throw error;
            setServices(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };
    
    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setEditingService(null);
        fetchData();
    };

    const handleDeleteConfirm = async () => {
        if (!deletingService) return;
        const { error } = await supabase.from('services').delete().eq('id', deletingService.id);
        if (error) {
            setError(`Error al eliminar: ${error.message}`);
        } else {
            fetchData();
        }
        setDeletingService(null);
    };

    return (
        <div className="fade-in" style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
            {isModalOpen && (
                <ServiceFormModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingService(null); }}
                    onSave={handleSaveSuccess}
                    serviceToEdit={editingService}
                />
            )}
            {deletingService && (
                <ConfirmationModal
                    isOpen={!!deletingService}
                    onClose={() => setDeletingService(null)}
                    onConfirm={handleDeleteConfirm}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar el servicio "<strong>{deletingService.name}</strong>"?</p>}
                />
            )}

            <section>
                <h2>Catálogo de Servicios</h2>
                
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: '12px', marginBottom: '2rem', border: `1px solid var(--primary-color)` }}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '1rem'}}>
                        <span style={{color: 'var(--primary-color)', marginTop: '0.25rem'}}>{ICONS.info}</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>¿Qué son los Servicios?</h3>
                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--primary-dark)', lineHeight: 1.6 }}>
                                Los <strong>Servicios</strong> representan los cobros individuales y únicos que ofreces, como una "Consulta de primera vez" o un "Seguimiento". Son la base para registrar pagos manuales en el expediente del paciente.
                            </p>
                            <p style={{ margin: '1rem 0 0 0', color: 'var(--primary-dark)', lineHeight: 1.6 }}>
                                Si buscas crear paquetes o suscripciones con duración, límites de consultas y beneficios en el portal, utiliza los <strong>Planes de Servicio</strong>.
                            </p>
                            <button onClick={() => navigate('service-plans')} className="button-secondary" style={{marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.3)'}}>
                                Ir a Planes de Servicio {ICONS.back}
                            </button>
                        </div>
                    </div>
                </div>


                <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} style={{marginBottom: '1.5rem'}}>
                    {ICONS.add} Crear Nuevo Servicio
                </button>

                {loading && <p>Cargando servicios...</p>}
                {error && <p style={styles.error}>{error}</p>}
                
                {!loading && services.length > 0 && (
                    <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {services.map(service => (
                            <div key={service.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 0 }}>
                                <div style={{flex: 1, padding: '1rem'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'}}>
                                        <h4 style={{margin: 0, color: 'var(--primary-color)', flex: '1 1 auto', wordBreak: 'break-word'}}>{service.name}</h4>
                                        <p style={{margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)', flexShrink: 0, textAlign: 'right'}}>${parseFloat(String(service.price)).toFixed(2)}</p>
                                    </div>
                                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>{service.description || 'Sin descripción.'}</p>
                                </div>
                                <div className="card-actions" style={{opacity: 1, borderTop: '1px solid var(--border-color)', padding: '0.75rem 1rem', justifyContent: 'flex-end'}}>
                                    <button onClick={() => handleEdit(service)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => setDeletingService(service)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && services.length === 0 && (
                     <p style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>Aún no has creado ningún servicio. ¡Añade tu primera consulta para empezar a registrar cobros!</p>
                )}
            </section>
        </div>
    );
};

export default ServiceManagement;