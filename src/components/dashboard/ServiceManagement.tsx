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
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
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

            {/* Hero Header */}
            <div style={{textAlign: 'center', marginBottom: '3rem', padding: '2.5rem', background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--surface-hover-color) 100%)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
                <h1 style={{fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem 0'}}>Catálogo de Servicios</h1>
                <p style={{color: 'var(--text-light)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto'}}>
                    Configura los servicios individuales que ofreces para cobros únicos o consultas sueltas.
                </p>
                <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifySelf: 'center', justifyContent: 'center'}}>
                     <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="button-primary" style={{padding: '0.8rem 1.5rem', borderRadius: '12px', fontSize: '1rem'}}>
                        {ICONS.add} Nuevo Servicio
                    </button>
                </div>
            </div>

            {/* Info Tip & Search Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem', alignItems: 'center' }}>
                 {/* Search Bar */}
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar servicios..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderRadius: '12px', borderColor: 'var(--border-color)', paddingLeft: '2.5rem', height: '50px'}}
                    />
                </div>

                {/* Pro Tip */}
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    backgroundColor: 'var(--primary-light)', 
                    borderRadius: '12px', 
                    border: `1px solid var(--primary-color)`,
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    color: 'var(--primary-dark)'
                }}>
                    <div style={{ fontSize: '1.5rem' }}>💡</div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>¿Buscas Membresías?</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
                            Para paquetes con duración y beneficios en la app, usa <span onClick={() => navigate('service-plans')} style={{textDecoration: 'underline', cursor: 'pointer', fontWeight: 700}}>Planes de Servicio</span>.
                        </p>
                    </div>
                </div>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)'}}>Cargando servicios...</div>}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    {filteredServices.map(service => (
                        <div key={service.id} className="card-hover" style={{ 
                            backgroundColor: 'var(--surface-color)', 
                            borderRadius: '16px', 
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ padding: '1.5rem', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--surface-hover-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontSize: '1.5rem'}}>
                                        {ICONS.activity}
                                    </div>
                                    <span style={{ 
                                        backgroundColor: 'var(--surface-hover-color)', 
                                        color: 'var(--text-color)', 
                                        padding: '6px 12px', 
                                        borderRadius: '20px', 
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        ${parseFloat(String(service.price)).toFixed(2)}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)' }}>{service.name}</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
                                    {service.description || 'Sin descripción adicional.'}
                                </p>
                            </div>
                            <div style={{ 
                                padding: '1rem 1.5rem', 
                                borderTop: '1px solid var(--border-color)', 
                                display: 'flex', 
                                gap: '0.75rem',
                                backgroundColor: 'var(--surface-hover-color)'
                            }}>
                                <button onClick={() => handleEdit(service)} style={{flex: 1, borderRadius: '8px', padding: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'}}>
                                    Editar
                                </button>
                                <button onClick={() => setDeletingService(service)} style={{width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--error-color)', cursor: 'pointer', transition: 'background 0.2s'}}>
                                    {ICONS.delete}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredServices.length === 0 && (
                 <div style={{ 
                     textAlign: 'center', 
                     padding: '4rem', 
                     border: '2px dashed var(--border-color)', 
                     borderRadius: '24px',
                     color: 'var(--text-light)',
                     backgroundColor: 'var(--surface-hover-color)'
                }}>
                    <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.briefcase}</div>
                    <p style={{fontSize: '1.1rem', marginBottom: '1.5rem'}}>No se encontraron servicios.</p>
                    <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="button-primary">
                        Crear el primero
                    </button>
                 </div>
            )}
        </div>
    );
};

export default ServiceManagement;