
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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

            // Fetch both types to calculate stats
            const [receivedRes, sentRes] = await Promise.all([
                supabase.from('referrals')
                .select('*, sending_clinic:clinics!referrals_sending_clinic_id_fkey(name), sending_ally:allies!referrals_sending_ally_id_fkey(full_name, specialty), persons!referrals_person_id_fkey(*)')
                .eq('receiving_ally_id', allyIdData)
                .order('created_at', { ascending: false }),
                
                supabase.from('referrals')
                .select('*, receiving_clinic:clinics!referrals_receiving_clinic_id_fkey(name), receiving_ally:allies!referrals_receiving_ally_id_fkey(full_name, specialty), persons!referrals_person_id_fkey(*)')
                .eq('sending_ally_id', allyIdData)
                .order('created_at', { ascending: false })
            ]);

            if (receivedRes.error) throw receivedRes.error;
            if (sentRes.error) throw sentRes.error;

            const receivedData = receivedRes.data as PopulatedReferral[];
            const sentData = sentRes.data as PopulatedReferral[];
            
            // We store all data but filter in render or derived state based on viewType
            setReferrals(viewType === 'received' ? receivedData : sentData);
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [viewType]); // Re-fetch when view type changes to keep logic simple

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
    };
    
    const handleDeleteReferral = async () => {
        if (!referralToDelete) return;
        const { error } = await supabase.from('referrals').delete().eq('id', referralToDelete.id);
        if (error) {
            setError(`Error al eliminar: ${error.message}`);
        }
        setReferralToDelete(null);
    };

    const filteredReferrals = useMemo(() => {
        return referrals.filter(r => {
            const matchesStatus = r.status === activeStatusTab;
            const patientInfo = r.patient_info as any;
            const matchesSearch = !debouncedSearchTerm || (patientInfo?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
    }, [referrals, activeStatusTab, debouncedSearchTerm]);
    
    const stats = useMemo(() => {
        const pendingCount = referrals.filter(r => r.status === 'pending').length;
        const acceptedCount = referrals.filter(r => r.status === 'accepted').length;
        return { pendingCount, acceptedCount };
    }, [referrals]);

    const StatWidget: FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
        <div style={{
            backgroundColor: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flex: 1
        }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px', 
                backgroundColor: `${color}20`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-color)' }}>{value}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    );

    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button
            onClick={() => setActiveStatusTab(id as any)}
            style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: activeStatusTab === id ? 'var(--surface-color)' : 'transparent',
                color: activeStatusTab === id ? 'var(--primary-color)' : 'var(--text-light)',
                boxShadow: activeStatusTab === id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
            }}
        >
            {label}
        </button>
    );

    const renderReferralsList = () => {
        if (loading) return <SkeletonLoader type="card" count={3} />;
        if (error) return <p style={styles.error}>{error}</p>;
        if (filteredReferrals.length === 0) return (
            <div style={{textAlign: 'center', padding: '4rem 2rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>📭</div>
                <p>No hay referidos {activeStatusTab === 'pending' ? 'pendientes' : activeStatusTab === 'accepted' ? 'aceptados' : 'rechazados'}.</p>
            </div>
        );

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredReferrals.map(r => {
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
                    
                    return (
                        <div key={r.id} className="card-hover" style={{
                            backgroundColor: 'var(--surface-color)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow)'
                        }}>
                            <div style={{ padding: '1.25rem', flex: 1 }}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                        color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px'
                                    }}>
                                        {viewType === 'received' ? 'Entrante' : 'Saliente'}
                                    </span>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>
                                    {patientInfo.name}
                                </h4>
                                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                    {age} • {patientInfo.gender || 'N/A'} • {patientInfo.phone || personData?.phone_number || '-'}
                                </p>

                                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                                    <p style={{fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 0.25rem 0'}}>
                                        {viewType === 'received' ? 'Referido por:' : 'Enviado a:'}
                                    </p>
                                    <p style={{margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)'}}>
                                        {partnerName} <span style={{fontWeight: 400, color: 'var(--text-light)'}}>({partnerType})</span>
                                    </p>
                                </div>
                                
                                {r.notes && (
                                    <div style={{marginTop: '1rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontStyle: 'italic'}}>
                                        "{r.notes}"
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
                                {viewType === 'received' && activeStatusTab === 'pending' ? (
                                    <>
                                        <button onClick={() => handleStatusUpdate(r.id, 'accepted')} className="button-primary" style={{flex: 1, justifyContent: 'center', fontSize: '0.9rem'}}>
                                            {ICONS.check} Aceptar
                                        </button>
                                        <button onClick={() => handleStatusUpdate(r.id, 'rejected')} style={{flex: 1, border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--error-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                            {ICONS.close} Rechazar
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setReferralToDelete(r); }} style={{width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-light)', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                        {ICONS.delete} Eliminar
                                    </button>
                                )}
                            </div>
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
                    message={<p>¿Estás seguro de que quieres eliminar este registro de referido?</p>}
                />
            )}
            
            {/* Header Section */}
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
                    Dashboard
                </h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Resumen de tu actividad de referencias y colaboración.
                </p>
            </div>
            
            {/* Stats Overview */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                <StatWidget label="Pendientes" value={stats.pendingCount} icon="⏳" color="#EAB308" />
                <StatWidget label="Aceptados" value={stats.acceptedCount} icon="✅" color="#10B981" />
            </div>

            {/* Main Content Area */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {/* Controls Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', backgroundColor: 'var(--surface-hover-color)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <button 
                            onClick={() => setViewType('received')}
                            style={{
                                padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                backgroundColor: viewType === 'received' ? 'var(--surface-color)' : 'transparent',
                                color: viewType === 'received' ? 'var(--primary-color)' : 'var(--text-light)',
                                boxShadow: viewType === 'received' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Recibidos
                        </button>
                        <button 
                            onClick={() => setViewType('sent')}
                            style={{
                                padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                backgroundColor: viewType === 'sent' ? 'var(--surface-color)' : 'transparent',
                                color: viewType === 'sent' ? 'var(--primary-color)' : 'var(--text-light)',
                                boxShadow: viewType === 'sent' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Enviados
                        </button>
                    </div>
                    
                    <div style={{...styles.searchInputContainer, margin: 0, maxWidth: '300px'}}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Buscar paciente..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', height: '42px'}} 
                        />
                    </div>
                </div>
                
                {/* Status Tabs */}
                <div style={{ backgroundColor: 'var(--surface-hover-color)', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px', maxWidth: '400px' }}>
                    <TabButton id="pending" label="Pendientes" />
                    <TabButton id="accepted" label="Aceptados" />
                    <TabButton id="rejected" label="Rechazados" />
                </div>

                {renderReferralsList()}
            </div>
        </div>
    );
};

export default AllyReferralsPage;
