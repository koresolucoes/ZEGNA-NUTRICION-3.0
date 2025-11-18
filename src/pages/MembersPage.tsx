
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

const AfiliadosPage: FC<{ isMobile: boolean; onViewDetails: (afiliadoId: string) => void; onAddAfiliado: () => void; onEditAfiliado: (afiliadoId: string) => void; }> = ({ isMobile, onViewDetails, onAddAfiliado, onEditAfiliado }) => {
    const { clinic, subscription } = useClinic();
    const [afiliados, setAfiliados] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
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
            <div style={styles.pageHeader}>
                 <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    Gestión de Afiliados
                    <HelpTooltip content="Clientes que llegan por convenios (empresas, gimnasios)." />
                </h1>
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

            {loading && <SkeletonLoader type={isMobile ? 'card' : 'table'} count={6} />}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                <div style={styles.tableContainer}>
                    {afiliados.length === 0 ? (
                      <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)'}}>
                          <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.users}</div>
                          <p>No se encontraron afiliados con los filtros aplicados.</p>
                      </div>
                    ) : (
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
                                            <img src={m.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${m.full_name}&radius=50`} alt="Avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{fontWeight: 500, color: 'var(--text-color)'}}>{m.full_name}</div>
                                            {isMobile && <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{m.phone_number}</div>}
                                        </td>
                                        {!isMobile && <td style={styles.td}>{m.phone_number || '-'}</td>}
                                        {!isMobile && <td style={styles.td}><code style={{backgroundColor: 'var(--surface-hover-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>{m.folio || '-'}</code></td>}
                                        <td style={styles.td}><PlanStatusIndicator planEndDate={m.subscription_end_date} /></td>
                                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                                            <div style={styles.actionButtons}>
                                                <button onClick={() => onViewDetails(m.id)} style={styles.iconButton} title="Ver Detalles">{ICONS.details}</button>
                                                <button onClick={() => onEditAfiliado(m.id)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                                <button onClick={() => openModal('transfer', m)} style={styles.iconButton} title="Transferir">{ICONS.transfer}</button>
                                                <button onClick={() => openModal('delete', m)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AfiliadosPage;
