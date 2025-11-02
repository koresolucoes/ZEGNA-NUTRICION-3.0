import React, { FC, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person } from '../types';
import PlanStatusIndicator from '../components/shared/PlanStatusIndicator';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { useClinic } from '../contexts/ClinicContext';
import HelpTooltip from '../components/calculators/tools/shared/HelpTooltip';

const StatusBadge: FC<{ planEndDate: string | null | undefined }> = ({ planEndDate }) => {
    let status: 'Activo' | 'Inactivo' | 'Sin Plan' = 'Sin Plan';
    let style: React.CSSProperties = {};

    if (planEndDate) {
        const endDate = new Date(planEndDate.replace(/-/g, '/')); // Fix for cross-browser date parsing
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only
        if (endDate >= today) {
            status = 'Activo';
        } else {
            status = 'Inactivo';
        }
    }

    switch(status) {
        case 'Activo':
            style = { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' };
            break;
        case 'Inactivo':
            style = { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
            break;
        case 'Sin Plan':
            style = { backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)', border: '1px solid var(--border-color)' };
            break;
    }

    return (
        <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...style }}>
            {status}
        </span>
    );
};


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
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);


    const maxPatients = subscription?.plans?.features ? (subscription.plans.features as any).max_patients : 0;
    const isPatientLimitReached = maxPatients > 0 && clients.length >= maxPatients;

    const localStyles = useMemo(() => ({
        pageContainer: {
            backgroundColor: 'var(--surface-color)',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '12px',
            marginTop: '1.5rem'
        },
        filterContainer: {
            display: 'flex',
            flexWrap: 'wrap' as 'wrap',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--background-color)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            alignItems: 'center',
        },
        th: {
            ...styles.th,
            textTransform: 'uppercase' as 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            color: 'var(--text-light)',
        },
        patientName: {
            fontWeight: 600,
            color: 'var(--text-color)',
        },
        patientPhone: {
            fontSize: '0.85rem',
            color: 'var(--text-light)',
            marginTop: '0.25rem',
        },
        actionMenuItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            width: '100%',
            textAlign: 'left' as const,
            fontSize: '0.9rem',
        },
    }), [isMobile]);

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
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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


    const ActionMenu: FC<{ person: Person }> = ({ person }) => {
        const isOpen = openActionMenu === person.id;
    
        const handleAction = (action: () => void) => {
            action();
            setOpenActionMenu(null);
        };
    
        return (
            <div style={{ position: 'relative' }}>
                <button onClick={() => setOpenActionMenu(isOpen ? null : person.id)} style={{...styles.iconButton, padding: '8px'}} title="Acciones">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                {isOpen && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', zIndex: 10, width: '180px', overflow: 'hidden'}} ref={actionMenuRef}>
                        <button onClick={() => handleAction(() => onViewDetails(person.id))} style={{...localStyles.actionMenuItem}} className="nav-item-hover">{ICONS.details} Ver Expediente</button>
                        <button onClick={() => handleAction(() => onEditClient(person.id))} style={{...localStyles.actionMenuItem}} className="nav-item-hover">{ICONS.edit} Editar Perfil</button>
                        <button onClick={() => handleAction(() => openModal('transfer', person))} style={{...localStyles.actionMenuItem}} className="nav-item-hover">{ICONS.transfer} Transferir</button>
                        <button onClick={() => handleAction(() => openModal('delete', person))} style={{...localStyles.actionMenuItem, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete} Eliminar</button>
                    </div>
                )}
            </div>
        );
    };

    const renderDesktopTable = () => (
        <table style={styles.table} aria-label="Tabla de pacientes">
            <thead>
                <tr>
                    <th style={{...localStyles.th}}>Paciente</th>
                    <th style={localStyles.th}>Folio</th>
                    <th style={localStyles.th}>Estado del Plan</th>
                    <th style={localStyles.th}>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {clients.map(c => (
                    <tr key={c.id} className="table-row-hover">
                        <td style={styles.td}>
                           <div onClick={() => onViewDetails(c.id)} style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'}}>
                                <img src={c.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${c.full_name}&radius=50`} alt="Avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />
                                <div>
                                    <p style={localStyles.patientName}>{c.full_name}</p>
                                    <p style={localStyles.patientPhone}>{c.phone_number || 'Sin teléfono'}</p>
                                </div>
                           </div>
                        </td>
                        <td style={styles.td}>{c.folio || '-'}</td>
                        <td style={styles.td}><StatusBadge planEndDate={c.subscription_end_date} /></td>
                        <td style={styles.td}>
                           <ActionMenu person={c} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderMobileCards = () => (
        <div>
            {clients.map(c => (
                <div key={c.id} style={{ ...styles.clientCard }} className="card-hover">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                        <div onClick={() => onViewDetails(c.id)} style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'}}>
                            <img src={c.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${c.full_name}&radius=50`} alt="Avatar" style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover'}} />
                            <div>
                                <h3 style={{margin: 0, color: 'var(--primary-color)'}}>{c.full_name}</h3>
                                <p style={localStyles.patientPhone}>{c.phone_number || 'Sin teléfono'}</p>
                            </div>
                        </div>
                        <ActionMenu person={c} />
                    </div>
                    <p style={{margin: '0.25rem 0'}}><strong>Folio:</strong> {c.folio || '-'}</p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', margin: '0.5rem 0 0 0', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <strong style={{margin: 0}}>Estado:</strong>
                        <StatusBadge planEndDate={c.subscription_end_date} />
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
            <div style={{...styles.pageHeader, padding: 0, border: 'none'}}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    Gestión de Pacientes
                    <HelpTooltip content="Un Paciente es un cliente individual y directo de tu clínica, que contrata tus servicios por cuenta propia." />
                </h1>
                <button onClick={onAddClient} disabled={isPatientLimitReached} title={isPatientLimitReached ? `Límite de ${maxPatients} pacientes alcanzado. Actualiza tu plan.` : 'Agregar nuevo paciente'}>
                    {ICONS.add} Agregar Paciente
                </button>
            </div>

            <div style={localStyles.pageContainer}>
                <div style={localStyles.filterContainer}>
                    <div style={{...styles.searchInputContainer, flexBasis: '400px'}}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input 
                            type="text"
                            placeholder="Buscar por nombre o folio..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{...styles.searchInput, height: '44px'}}
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{marginBottom: 0, width: 'auto', minWidth: '180px', height: '44px'}}>
                        <option value="all">Todos los estados</option>
                        <option value="active">Plan Activo</option>
                        <option value="expired">Plan Vencido</option>
                    </select>
                </div>

                {loading && <p>Cargando pacientes...</p>}
                {error && <p style={styles.error}>{error}</p>}
                {!loading && !error && (
                    <div style={!isMobile ? styles.tableContainer : {}}>
                        {clients.length === 0 ? (
                        <p style={{textAlign: 'center', padding: '2rem'}}>No se encontraron pacientes con los filtros aplicados.</p>
                        ) : (
                        isMobile ? renderMobileCards() : renderDesktopTable()
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientsPage;