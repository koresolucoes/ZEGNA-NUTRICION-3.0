import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person } from '../types';
import PlanStatusIndicator from '../components/shared/PlanStatusIndicator';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { useClinic } from '../contexts/ClinicContext';
import HelpTooltip from '../components/calculators/tools/shared/HelpTooltip';

const ClientsPage: FC<{ isMobile: boolean; onViewDetails: (personId: string) => void; onAddClient: () => void; onEditClient: (personId: string) => void; }> = ({ isMobile, onViewDetails, onAddClient, onEditClient }) => {
    const { clinic, subscription } = useClinic();
    const [clients, setClients] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'expired'
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        action: 'transfer' | 'delete' | null;
        data: Person | null;
    }>({ isOpen: false, action: null, data: null });

    const maxPatients = subscription?.plans?.features ? (subscription.plans.features as any).max_patients : 0;
    const isPatientLimitReached = maxPatients > 0 && clients.length >= maxPatients;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const fetchClients = useCallback(async () => {
        if (!clinic) return;
        setLoading(true); setError(null);
        try {
            let query = supabase.from('persons').select('*').eq('clinic_id', clinic.id).eq('person_type', 'client');

            if (debouncedSearchTerm) {
                query = query.or(`full_name.ilike.%${debouncedSearchTerm}%,folio.ilike.%${debouncedSearchTerm}%`);
            }
            
            const today = new Date().toISOString().split('T')[0];
            if (statusFilter === 'active') {
                query = query.gte('subscription_end_date', today);
            } else if (statusFilter === 'expired') {
                query = query.lt('subscription_end_date', today);
            }

            const { data, error: dbError } = await query.order('created_at', { ascending: false });

            if (dbError) throw dbError;
            setClients(data || []);
        } catch (err: any) { 
            setError(err.message);
        } finally { 
            setLoading(false); 
        }
    }, [clinic, debouncedSearchTerm, statusFilter]);

    useEffect(() => {
        if (!clinic) return;
        
        fetchClients();

        const channel = supabase.channel('persons-clients-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'persons',
                    filter: `clinic_id=eq.${clinic.id}`
                },
                (payload) => {
                    fetchClients();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchClients, clinic]);
    
    const executeDeleteClient = async (personId: string) => {
      try {
        const { error: dbError } = await supabase.from('persons').delete().eq('id', personId);
        if (dbError) throw dbError;
        setClients(prevClients => prevClients.filter(client => client.id !== personId));
      } catch (err: any) { setError(err.message); }
    };

    const executeTransferToAfiliado = async (person: Person) => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('persons')
                .update({ person_type: 'member' })
                .eq('id', person.id);
            if (updateError) throw updateError;
        } catch (err: any) {
            setError(`Error en la transferencia: ${err.message}.`);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (action: 'transfer' | 'delete', data: Person) => {
        setModalState({ isOpen: true, action, data });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, action: null, data: null });
    };

    const handleConfirm = () => {
        if (!modalState.data || !modalState.action) return;

        if (modalState.action === 'transfer') {
            executeTransferToAfiliado(modalState.data);
        } else if (modalState.action === 'delete') {
            executeDeleteClient(modalState.data.id);
        }
        closeModal();
    };


    const renderDesktopTable = () => (
        <table style={styles.table} aria-label="Tabla de pacientes">
            <thead>
                <tr>
                    <th style={{...styles.th, width: '60px'}}></th>
                    <th style={styles.th}>Nombre Paciente</th>
                    <th style={styles.th}>Teléfono</th>
                    <th style={styles.th}>Folio</th>
                    <th style={styles.th}>Estado Plan</th>
                    <th style={styles.th}>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {clients.map(c => (
                    <tr key={c.id} className="table-row-hover" onClick={() => onViewDetails(c.id)} style={{ cursor: 'pointer' }}>
                        <td style={styles.td}>
                            <img src={c.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${c.full_name}&radius=50`} alt="Avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />
                        </td>
                        <td style={styles.td}>{c.full_name}</td>
                        <td style={styles.td}>{c.phone_number || '-'}</td>
                        <td style={styles.td}>{c.folio || '-'}</td>
                        <td style={styles.td}><PlanStatusIndicator planEndDate={c.subscription_end_date} /></td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.actionButtons}>
                                <button onClick={() => onViewDetails(c.id)} style={styles.iconButton} title="Ver Detalles">{ICONS.details}</button>
                                <button onClick={() => onEditClient(c.id)} style={styles.iconButton} title="Editar Paciente">{ICONS.edit}</button>
                                <button onClick={() => openModal('transfer', c)} style={styles.iconButton} title="Transferir a Afiliado">{ICONS.transfer}</button>
                                <button onClick={() => openModal('delete', c)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar Paciente">{ICONS.delete}</button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderMobileCards = () => (
        <div>
            {clients.map(c => (
                <div key={c.id} style={{ ...styles.clientCard, cursor: 'pointer' }} className="card-hover" onClick={() => onViewDetails(c.id)}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <img src={c.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${c.full_name}&radius=50`} alt="Avatar" style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover'}} />
                            <h3 style={{margin: 0, color: 'var(--primary-color)'}}>{c.full_name}</h3>
                        </div>
                        <div style={styles.actionButtons} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onEditClient(c.id)} style={styles.iconButton} title="Editar Paciente">{ICONS.edit}</button>
                             <button onClick={() => openModal('transfer', c)} style={styles.iconButton} title="Transferir a Afiliado">{ICONS.transfer}</button>
                            <button onClick={() => openModal('delete', c)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar Paciente">{ICONS.delete}</button>
                        </div>
                    </div>
                    <p style={{margin: '0.25rem 0'}}><strong>Teléfono:</strong> {c.phone_number || '-'}</p>
                    <p style={{margin: '0.25rem 0'}}><strong>Folio:</strong> {c.folio || '-'}</p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', margin: '0.25rem 0'}}>
                        <strong style={{margin: 0}}>Plan:</strong>
                        <PlanStatusIndicator planEndDate={c.subscription_end_date} />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fade-in">
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={handleConfirm}
                title={`Confirmar ${modalState.action === 'transfer' ? 'Transferencia' : 'Eliminación'}`}
                message={
                    modalState.action === 'transfer' ? (
                        <>
                            <p>¿Estás seguro de que quieres transferir a <strong>{modalState.data?.full_name}</strong> a la lista de "Afiliados"?</p>
                            <p style={{color: 'var(--error-color)', fontWeight: 500}}>ADVERTENCIA: Esta acción es irreversible. El perfil del paciente será reclasificado como afiliado, manteniendo todo su historial.</p>
                        </>
                    ) : (
                        <p>¿Estás seguro? Se eliminarán el paciente <strong>{modalState.data?.full_name}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.</p>
                    )
                }
                confirmText={modalState.action === 'transfer' ? 'Sí, transferir' : 'Sí, eliminar'}
            />
            <div style={styles.pageHeader}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    Gestión de Pacientes
                    <HelpTooltip content="Un Paciente es un cliente individual y directo de tu clínica, que contrata tus servicios por cuenta propia." />
                </h1>
                <button onClick={onAddClient} disabled={isPatientLimitReached} title={isPatientLimitReached ? `Límite de ${maxPatients} pacientes alcanzado. Actualiza tu plan.` : 'Agregar nuevo paciente'}>
                    {ICONS.add} Agregar
                </button>
            </div>

            <div style={styles.filterBar}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text"
                        placeholder="Buscar por nombre o folio..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <div style={styles.filterButtonGroup}>
                    <button onClick={() => setStatusFilter('all')} className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}>Todos</button>
                    <button onClick={() => setStatusFilter('active')} className={`filter-button ${statusFilter === 'active' ? 'active' : ''}`}>Activos</button>
                    <button onClick={() => setStatusFilter('expired')} className={`filter-button ${statusFilter === 'expired' ? 'active' : ''}`}>Vencidos</button>
                </div>
            </div>

            {loading && <p>Cargando pacientes...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                <div style={styles.tableContainer}>
                    {clients.length === 0 ? (
                      <p style={{textAlign: 'center', padding: '2rem'}}>No se encontraron pacientes con los filtros aplicados.</p>
                    ) : (
                      isMobile ? renderMobileCards() : renderDesktopTable()
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientsPage;