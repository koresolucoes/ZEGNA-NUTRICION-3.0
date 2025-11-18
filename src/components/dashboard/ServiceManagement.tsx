import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredServices = useMemo(() => {
        return services.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [services, searchTerm]);

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Catálogo de Servicios</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Gestiona los servicios individuales y sus costos.</p>
                </div>
                <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="button-primary">
                    {ICONS.add} Nuevo Servicio
                </button>
            </div>

            {/* Info Banner */}
            <div style={{ 
                padding: '1.25rem', 
                backgroundColor: 'var(--surface-hover-color)', 
                borderRadius: '12px', 
                marginBottom: '2rem', 
                border: `1px solid var(--border-color)`,
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
            }}>
                <div style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>{ICONS.info}</div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>¿Servicios o Planes?</h3>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                        Los <strong>Servicios</strong> son cobros únicos (ej. Consulta Suelta). Para paquetes con duración y beneficios en la app, usa <strong>Planes</strong>.
                    </p>
                    <button 
                        onClick={() => navigate('service-plans')} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            padding: 0, 
                            color: 'var(--primary-color)', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Ir a Planes de Servicio →
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar servicios..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>Cargando servicios...</div>}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredServices.map(service => (
                        <div key={service.id} style={{ 
                            backgroundColor: 'var(--surface-color)', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex',
                            flexDirection: 'column'
                        }} className="card-hover">
                            <div style={{ padding: '1.25rem', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>{service.name}</h3>
                                    <span style={{ 
                                        backgroundColor: 'var(--primary-light)', 
                                        color: 'var(--primary-dark)', 
                                        padding: '4px 8px', 
                                        borderRadius: '6px', 
                                        fontWeight: 700,
                                        fontSize: '0.95rem' 
                                    }}>
                                        ${parseFloat(String(service.price)).toFixed(2)}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                                    {service.description || 'Sin descripción.'}
                                </p>
                            </div>
                            <div style={{ 
                                padding: '0.75rem 1.25rem', 
                                borderTop: '1px solid var(--border-color)', 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: '0.5rem',
                                backgroundColor: 'var(--surface-hover-color)'
                            }}>
                                <button onClick={() => handleEdit(service)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)'}} title="Editar">{ICONS.edit}</button>
                                <button onClick={() => setDeletingService(service)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredServices.length === 0 && (
                 <div style={{ 
                     textAlign: 'center', 
                     padding: '3rem', 
                     border: '2px dashed var(--border-color)', 
                     borderRadius: '12px',
                     color: 'var(--text-light)' 
                }}>
                    <p style={{fontSize: '1.1rem', marginBottom: '1rem'}}>No se encontraron servicios.</p>
                    <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="button-secondary">
                        Crear el primero
                    </button>
                 </div>
            )}
        </div>
    );
};

export default ServiceManagement;