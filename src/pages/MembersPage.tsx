import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person } from '../types';
import PlanStatusIndicator from '../components/shared/PlanStatusIndicator';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { useClinic } from '../contexts/ClinicContext';
import HelpTooltip from '../components/calculators/tools/shared/HelpTooltip';
import SkeletonLoader from '../components/shared/SkeletonLoader';

const getInitials = (name: string | null | undefined) => {
    return (name || '').trim().charAt(0).toUpperCase() || '?';
};

const AfiliadoAvatar: FC<{ person: Person, size?: number, fontSize?: string }> = ({ person, size = 64, fontSize = '1.8rem' }) => {
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface-color) 100%)',
            color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: fontSize, flexShrink: 0,
            border: '1px solid var(--primary-light)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
        }}>
            {getInitials(person.full_name)}
        </div>
    );
};

const AfiliadoCard: FC<{ 
    person: Person;
    onViewDetails: (id: string) => void;
    onEditAfiliado: (id: string) => void;
    onDeleteAfiliado: (person: Person) => void;
}> = ({ person, onViewDetails, onEditAfiliado, onDeleteAfiliado }) => (
    <div 
        className="card-hover" 
        onClick={() => onViewDetails(person.id)}
        style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            transition: 'all 0.2s',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'var(--shadow)'
        }}
    >
            {/* Top Section: Status Badge (Absolute to not shift layout, but with safe padding) */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}>
            <PlanStatusIndicator planEndDate={person.subscription_end_date} />
        </div>

        {/* Content - Increased padding top to avoid overlap */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '3.5rem' }}>
                <AfiliadoAvatar person={person} />
            <div style={{flex: 1, minWidth: 0}}>
                    <h3 style={{margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={person.full_name || ''}>
                    {person.full_name || 'Sin Nombre'}
                </h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.5rem'}}>
                    {person.folio && (
                        <span style={{fontSize: '0.8rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-hover-color)', padding: '2px 8px', borderRadius: '6px', alignSelf: 'flex-start', fontWeight: 500}}>
                            Folio: {person.folio}
                        </span>
                    )}
                        {person.phone_number && (
                        <span style={{fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                            {ICONS.phone} {person.phone_number}
                        </span>
                    )}
                </div>
            </div>
        </div>
        
        <div style={{
            marginTop: 'auto', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: 'var(--surface-hover-color)', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.75rem'
        }}>
            <button onClick={(e) => { e.stopPropagation(); onEditAfiliado(person.id); }} className="button-secondary" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem'}}>
                {ICONS.edit} Editar
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteAfiliado(person); }} className="button-secondary" style={{flex: 1, color: 'var(--error-color)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem'}} title="Eliminar">
                {ICONS.delete} Eliminar
            </button>
        </div>
    </div>
);

const TableActionButton: FC<{ onClick: (e: React.MouseEvent) => void, icon: React.ReactNode, title: string, danger?: boolean }> = ({ onClick, icon, title, danger }) => (
    <button 
        onClick={onClick} 
        title={title}
        style={{
            ...styles.iconButton,
            width: '32px',
            height: '32px',
            padding: '6px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-hover-color)',
            border: '1px solid var(--border-color)',
            color: danger ? 'var(--error-color)' : 'var(--text-color)',
        }}
    >
        {icon}
    </button>
);

const AfiliadosPage: FC<{ isMobile: boolean; onViewDetails: (afiliadoId: string) => void; onAddAfiliado: () => void; onEditAfiliado: (afiliadoId: string) => void; }> = ({ isMobile, onViewDetails, onAddAfiliado, onEditAfiliado }) => {
    const { clinic, subscription } = useClinic();
    const [afiliados, setAfiliados] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // View Toggle
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        action: 'transfer' | 'delete' | null;
        data: Person | null;
    }>({ isOpen: false, action: null, data: null });
    
    const maxPersons = subscription?.plans?.features ? (subscription.plans.features as any).max_patients : 0;
    const isPersonLimitReached = maxPersons > 0 && afiliados.length >= maxPersons;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const fetchAfiliados = useCallback(async () => {
        if (!clinic) return;
        setLoading(true); setError(null);
        try {
            let query = supabase.from('persons').select('*').eq('clinic_id', clinic.id).eq('person_type', 'member');

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
            setAfiliados(data || []);
        } catch (err: any) { 
            setError(err.message);
        } finally { 
            setLoading(false); 
        }
    }, [clinic, debouncedSearchTerm, statusFilter]);

    useEffect(() => {
        if (!clinic) return;
        fetchAfiliados();
        const channel = supabase.channel('persons-members-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persons', filter: `clinic_id=eq.${clinic.id}` }, () => fetchAfiliados())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchAfiliados, clinic]);
    
    const executeDeleteAfiliado = async (afiliadoId: string) => {
      try {
        const { error: dbError } = await supabase.from('persons').delete().eq('id', afiliadoId);
        if (dbError) throw dbError;
        setAfiliados(prevAfiliados => prevAfiliados.filter(afiliado => afiliado.id !== afiliadoId));
      } catch (err: any) { setError(err.message); }
    };

    const executeTransferToClient = async (afiliado: Person) => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { error: updateError } = await supabase.from('persons').update({ person_type: 'client' }).eq('id', afiliado.id);
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
        if (modalState.action === 'transfer') executeTransferToClient(modalState.data);
        else if (modalState.action === 'delete') executeDeleteAfiliado(modalState.data.id);
        closeModal();
    };

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
                            <p>¿Transferir a <strong>{modalState.data?.full_name}</strong> a la lista de "Pacientes"?</p>
                            <p style={{color: 'var(--error-color)', fontWeight: 500}}>ADVERTENCIA: El perfil será reclasificado como paciente, manteniendo su historial.</p>
                        </>
                    ) : (
                        <p>¿Estás seguro? Se eliminará el afiliado <strong>{modalState.data?.full_name}</strong> y todos sus datos. Acción irreversible.</p>
                    )
                }
                confirmText={modalState.action === 'transfer' ? 'Sí, transferir' : 'Sí, eliminar'}
                confirmButtonClass={modalState.action === 'delete' ? 'button-danger' : 'button-primary'}
            />
            <div style={{...styles.pageHeader, alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                     <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        Gestión de Afiliados
                        <HelpTooltip content="Clientes que llegan por convenios (empresas, gimnasios)." />
                    </h1>
                    {/* View Toggle Switch */}
                    <div style={{display: 'flex', gap: '0.25rem', backgroundColor: 'var(--surface-color)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                        <button 
                            onClick={() => setViewMode('grid')} 
                            style={{...styles.iconButton, backgroundColor: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent', color: viewMode === 'grid' ? 'var(--primary-color)' : 'var(--text-light)', borderRadius: '6px', padding: '6px'}}
                            title="Vista Cuadrícula"
                        >
                            {ICONS.grid}
                        </button>
                        <button 
                            onClick={() => setViewMode('list')} 
                            style={{...styles.iconButton, backgroundColor: viewMode === 'list' ? 'var(--primary-light)' : 'transparent', color: viewMode === 'list' ? 'var(--primary-color)' : 'var(--text-light)', borderRadius: '6px', padding: '6px'}}
                            title="Vista Lista"
                        >
                            {ICONS.list}
                        </button>
                    </div>
                </div>
                <button onClick={onAddAfiliado} disabled={isPersonLimitReached} className="button-primary" title={isPersonLimitReached ? `Límite de ${maxPersons} alcanzado.` : 'Agregar nuevo afiliado'}>
                    {ICONS.add} Nuevo Afiliado
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

            {loading && <SkeletonLoader type={viewMode === 'grid' ? 'card' : 'table'} count={6} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && !error && (
                <>
                    {afiliados.length === 0 ? (
                      <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                          <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.users}</div>
                          <p>No se encontraron afiliados con los filtros aplicados.</p>
                          <button onClick={() => {setSearchTerm(''); setStatusFilter('all');}} style={{marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline'}}>Limpiar filtros</button>
                      </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {afiliados.map(m => (
                                    <AfiliadoCard 
                                        key={m.id} 
                                        person={m} 
                                        onViewDetails={onViewDetails}
                                        onEditAfiliado={onEditAfiliado}
                                        onDeleteAfiliado={(person) => openModal('delete', person)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{...styles.th, width: '60px'}}></th>
                                            <th style={styles.th}>Nombre</th>
                                            {!isMobile && <th style={styles.th}>Contacto</th>}
                                            {!isMobile && <th style={styles.th}>Folio</th>}
                                            <th style={styles.th}>Estado Suscripción</th>
                                            <th style={styles.th}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {afiliados.map(m => (
                                            <tr key={m.id} className="table-row-hover" onClick={() => onViewDetails(m.id)} style={{ cursor: 'pointer' }}>
                                                <td style={styles.td}>
                                                    <AfiliadoAvatar person={m} size={36} fontSize="0.9rem" />
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{fontWeight: 600, color: 'var(--text-color)'}}>{m.full_name || 'Sin Nombre'}</div>
                                                    {isMobile && <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{m.phone_number}</div>}
                                                </td>
                                                {!isMobile && <td style={styles.td}>{m.phone_number || '-'}</td>}
                                                {!isMobile && <td style={styles.td}><code style={{backgroundColor: 'var(--surface-hover-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>{m.folio || '-'}</code></td>}
                                                <td style={styles.td}><PlanStatusIndicator planEndDate={m.subscription_end_date} /></td>
                                                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{display: 'flex', gap: '0.5rem'}}>
                                                        <TableActionButton onClick={() => onEditAfiliado(m.id)} icon={ICONS.edit} title="Editar" />
                                                        <TableActionButton onClick={() => openModal('delete', m)} icon={ICONS.delete} title="Eliminar" danger />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default AfiliadosPage;
