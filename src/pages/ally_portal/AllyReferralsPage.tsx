import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Person, PopulatedReferral } from '../../types';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

const calculateAge = (birthDate: string | null | undefined): string => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate.replace(/-/g, '/'));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return `${age} años`;
};

const actionButtonStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
    padding: '0.5rem', borderRadius: '8px', flex: 1, fontSize: '0.75rem',
    textAlign: 'center', lineHeight: 1.2
};


const AllyReferralsPage: FC = () => {
    const [referrals, setReferrals] = useState<PopulatedReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewType, setViewType] = useState<'received' | 'sent'>('received');
    const [activeStatusTab, setActiveStatusTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const [referralToDelete, setReferralToDelete] = useState<PopulatedReferral | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchReferrals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if(allyIdError) throw allyIdError;

            let query;
            if (viewType === 'received') {
                query = supabase
                    .from('referrals')
                    .select('*, sending_clinic:clinics!referrals_sending_clinic_id_fkey(name), sending_ally:allies!referrals_sending_ally_id_fkey(full_name, specialty), persons!referrals_person_id_fkey(*)')
                    .eq('receiving_ally_id', allyIdData);
            } else { // 'sent'
                 query = supabase
                    .from('referrals')
                    .select('*, receiving_clinic:clinics!referrals_receiving_clinic_id_fkey(name), receiving_ally:allies!referrals_receiving_ally_id_fkey(full_name, specialty), persons!referrals_person_id_fkey(*)')
                    .eq('sending_ally_id', allyIdData);
            }

            query = query.order('created_at', { ascending: false });
            
            if (debouncedSearchTerm) {
                query = query.ilike('patient_info->>name', `%${debouncedSearchTerm}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            setReferrals(data as PopulatedReferral[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, viewType]);

    useEffect(() => {
        fetchReferrals();
        const channel = supabase.channel('ally-referrals-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, fetchReferrals)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchReferrals]);
    
    const handleStatusUpdate = async (referralId: string, status: 'accepted' | 'rejected') => {
        const { error } = await supabase.rpc('update_referral_status_as_ally', {
            p_referral_id: referralId,
            p_new_status: status
        });
        if (error) {
            setError(`Error al actualizar: ${error.message}`);
        }
        // Data will refresh via realtime subscription
    };
    
    const handleDeleteReferral = async () => {
        if (!referralToDelete) return;
        const { error } = await supabase.from('referrals').delete().eq('id', referralToDelete.id);
        if (error) {
            setError(`Error al eliminar: ${error.message}`);
        }
        setReferralToDelete(null);
        // data will refetch via subscription
    };

    const filteredReferrals = referrals.filter(r => r.status === activeStatusTab);
    
    const renderReferralsList = (referralsToRender: PopulatedReferral[]) => {
        if (loading) return <SkeletonLoader type="card" count={4} />;
        if (error) return <p style={styles.error}>{error}</p>;
        if (referralsToRender.length === 0) return <p>No hay referidos en esta categoría.</p>;

        return (
            <div className="info-grid">
                {referralsToRender.map(r => {
                    const patientInfo = r.patient_info as any;
                    const personData = r.persons;
                    
                    let partnerName: string;
                    let partnerType: string;

                    if (viewType === 'received') {
                        partnerName = r.sending_clinic?.name || r.sending_ally?.full_name || 'Fuente desconocida';
                        partnerType = r.sending_clinic ? 'Clínica' : 'Aliado';
                    } else { // sent
                        partnerName = r.receiving_clinic?.name || r.receiving_ally?.full_name || 'Destino desconocido';
                        partnerType = r.receiving_clinic ? 'Clínica' : 'Aliado';
                    }

                    const age = patientInfo?.age || (personData?.birth_date ? calculateAge(personData.birth_date) : 'N/A');
                    const gender = patientInfo?.gender || (personData?.gender === 'male' ? 'Hombre' : personData?.gender === 'female' ? 'Mujer' : 'N/A');
                    const healthGoal = patientInfo?.health_goal || personData?.health_goal || 'No especificado';
                    const lastWeight = patientInfo?.last_weight;
                    const lastImc = patientInfo?.last_imc;

                    return (
                        <div key={r.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch' }}>
                            <div style={{ padding: '1rem', flex: 1 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{patientInfo.name}</h4>
                                <p style={{ margin: '0.25rem 0' }}><strong>Tel:</strong> {patientInfo.phone || personData?.phone_number || '-'}</p>
                                <p style={{ margin: '0.25rem 0 0.75rem 0' }}><strong>{viewType === 'received' ? 'Referido por:' : 'Referido a:'}</strong> {partnerName} ({partnerType})</p>
                                
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>Motivo del Referido</h5>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}><em>{r.notes || 'Sin notas.'}</em></p>
                                </div>
                                
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600 }}>Contexto Clínico</h5>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Edad:</strong> {age}</p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Género:</strong> {gender}</p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Objetivo:</strong> {healthGoal}</p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Último Peso:</strong> {lastWeight ? `${lastWeight} kg` : 'N/A'}</p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Último IMC:</strong> {lastImc || 'N/A'}</p>
                                </div>
                            </div>
                            
                            {( (viewType === 'received' && activeStatusTab === 'pending') || (viewType === 'sent' && activeStatusTab === 'pending') ) && (
                                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                                    {viewType === 'received' && activeStatusTab === 'pending' && (
                                        <>
                                            <button onClick={() => handleStatusUpdate(r.id, 'accepted')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">
                                                {ICONS.check}
                                                <span>Aceptar</span>
                                            </button>
                                            <button onClick={() => handleStatusUpdate(r.id, 'rejected')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">
                                                {ICONS.close}
                                                <span>Rechazar</span>
                                            </button>
                                        </>
                                    )}
                                    {viewType === 'sent' && activeStatusTab === 'pending' && (
                                        <button onClick={(e) => { e.stopPropagation(); setReferralToDelete(r); }} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">
                                            {ICONS.delete}
                                            <span>Cancelar Envío</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )
    };

    return (
        <div className="fade-in">
            {referralToDelete && (
                <ConfirmationModal
                    isOpen={!!referralToDelete}
                    onClose={() => setReferralToDelete(null)}
                    onConfirm={handleDeleteReferral}
                    title="Confirmar Acción"
                    message={<p>¿Estás seguro de que quieres {viewType === 'sent' ? 'cancelar el envío de' : 'eliminar'} este referido? Esta acción no se puede deshacer.</p>}
                />
            )}
            <div style={styles.pageHeader}>
                <h1>Gestión de Referidos</h1>
            </div>
            
            <nav className="tabs">
                <button className={`tab-button ${viewType === 'received' ? 'active' : ''}`} onClick={() => setViewType('received')}>Recibidos</button>
                <button className={`tab-button ${viewType === 'sent' ? 'active' : ''}`} onClick={() => setViewType('sent')}>Enviados</button>
            </nav>
            
            <div style={{ marginTop: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', padding: '1.5rem' }}>
                <nav className="sub-tabs" style={{marginTop: 0, marginBottom: '1.5rem'}}>
                    <button className={`sub-tab-button ${activeStatusTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveStatusTab('pending')}>Pendientes</button>
                    <button className={`sub-tab-button ${activeStatusTab === 'accepted' ? 'active' : ''}`} onClick={() => setActiveStatusTab('accepted')}>Aceptados</button>
                    <button className={`sub-tab-button ${activeStatusTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveStatusTab('rejected')}>Rechazados</button>
                </nav>

                <div style={{...styles.filterBar, marginBottom: '1.5rem'}}>
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar por paciente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.searchInput} />
                    </div>
                </div>
                
                {renderReferralsList(filteredReferrals)}
            </div>
        </div>
    );
};

export default AllyReferralsPage;