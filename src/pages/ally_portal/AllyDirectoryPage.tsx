
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Ally } from '../../types';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import AllyDetailsModal from '../../components/collaborators/AllyDetailsModal';
import CatalogCard from '../../components/shared/CatalogCard';

type PartnershipStatusMap = { [allyId: string]: 'pending' | 'active' | 'revoked' | 'rejected' | 'none' };

const AllyDirectoryPage: FC<{ navigate: (page: string) => void }> = ({ navigate }) => {
    const [allies, setAllies] = useState<Ally[]>([]);
    const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatusMap>({});
    const [myId, setMyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Todos');
    const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading'>>({});
    const [viewingAlly, setViewingAlly] = useState<Ally | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError || !allyIdData) {
                console.warn("Could not get current ally ID. User might need to complete profile setup.");
            }
            setMyId(allyIdData);

            const [alliesRes, partnershipsRes] = await Promise.all([
                supabase.from('allies').select('*').order('full_name'),
                allyIdData ? supabase.from('ally_ally_partnerships').select('*').or(`requester_id.eq.${allyIdData},responder_id.eq.${allyIdData}`) : { data: [], error: null }
            ]);
            
            if (alliesRes.error) throw alliesRes.error;
            if (partnershipsRes.error) throw partnershipsRes.error;

            setAllies(alliesRes.data || []);

            const statusMap: PartnershipStatusMap = {};
            (partnershipsRes.data || []).forEach(p => {
                const otherAllyId = p.requester_id === allyIdData ? p.responder_id : p.requester_id;
                statusMap[otherAllyId] = p.status as 'pending' | 'active' | 'revoked';
            });
            setPartnershipStatus(statusMap);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleRequestPartnership = async (responderId: string) => {
        if (!myId) {
            alert("Debes completar tu perfil de colaborador antes de conectar con otros.");
            navigate('profile');
            return;
        }
        setRequestStatus(prev => ({...prev, [responderId]: 'loading'}));
        
        const { error: rpcError } = await supabase.rpc('request_ally_partnership', {
            p_responder_id: responderId
        });
        
        setRequestStatus(prev => ({...prev, [responderId]: 'idle'}));

        if (rpcError) {
            alert(`Error al enviar solicitud: ${rpcError.message}`);
        } else {
            setPartnershipStatus(prev => ({ ...prev, [responderId]: 'pending' }));
        }
    };
    
    const specialties = useMemo(() => {
        const unique = new Set(allies.map(a => a.specialty).filter(Boolean));
        return ['Todos', ...Array.from(unique).sort()];
    }, [allies]);
    
    const filteredAllies = useMemo(() => {
        return allies.filter(ally => {
            const matchesSearch = ally.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  ally.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedSpecialty === 'Todos' || ally.specialty === selectedSpecialty;
            return matchesSearch && matchesCategory;
        });
    }, [allies, searchTerm, selectedSpecialty]);

    const actionButtonStyle = (primary: boolean = false): React.CSSProperties => ({
        flex: 1,
        padding: '0.6rem',
        borderRadius: '8px',
        border: '1px solid transparent',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: primary ? 'var(--primary-color)' : 'transparent',
        color: primary ? '#ffffff' : 'var(--text-color)',
        transition: 'all 0.2s',
        borderColor: primary ? 'transparent' : 'var(--border-color)'
    });

    return (
        <div className="fade-in" style={{maxWidth: '1200px', margin: '0 auto'}}>
            {viewingAlly && <AllyDetailsModal isOpen={!!viewingAlly} onClose={() => setViewingAlly(null)} ally={viewingAlly} />}
            
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Directorio de Especialistas</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Explora la red Zegna y conecta con profesionales complementarios.
                </p>
            </div>

            {/* Filters Bar */}
            <div style={{
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '1rem', 
                backgroundColor: 'var(--surface-color)', 
                padding: '1rem', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)',
                marginBottom: '2rem',
                alignItems: 'center'
            }}>
                <div style={{...styles.searchInputContainer, flex: '1 1 300px'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, especialidad..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{...styles.searchInput, backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)', height: '42px'}} 
                    />
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%'}} className="hide-scrollbar">
                    {specialties.map(spec => (
                        <button
                            key={spec}
                            onClick={() => setSelectedSpecialty(spec)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                border: selectedSpecialty === spec ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                backgroundColor: selectedSpecialty === spec ? 'var(--primary-light)' : 'var(--background-color)',
                                color: selectedSpecialty === spec ? 'var(--primary-dark)' : 'var(--text-light)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {spec}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <SkeletonLoader type="card" count={8} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && !error && (
                <>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem'}}>
                        Mostrando {filteredAllies.length} profesional{filteredAllies.length !== 1 ? 'es' : ''}
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredAllies.map(ally => {
                            const isMyProfile = ally.id === myId;
                            const status = partnershipStatus[ally.id];
                            const isLoading = requestStatus[ally.id] === 'loading';
                            
                            let actionButton;
                            if (isMyProfile) {
                                actionButton = <button onClick={() => navigate('profile')} className="button-secondary" style={{width: '100%', justifyContent: 'center', fontSize: '0.85rem'}}> {ICONS.edit} Editar Mi Perfil </button>;
                            } else {
                                switch(status) {
                                    case 'active':
                                        actionButton = (
                                            <button disabled style={{width: '100%', justifyContent: 'center', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', cursor: 'default', borderRadius: '8px', padding: '0.6rem', fontWeight: 600, fontSize: '0.85rem'}}>
                                                {ICONS.check} Vinculado
                                            </button>
                                        );
                                        break;
                                    case 'pending':
                                        actionButton = (
                                            <button disabled style={{width: '100%', justifyContent: 'center', backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)', border: '1px solid var(--border-color)', cursor: 'default', borderRadius: '8px', padding: '0.6rem', fontWeight: 600, fontSize: '0.85rem'}}> 
                                                {ICONS.clock} Solicitud Enviada 
                                            </button>
                                        );
                                        break;
                                    case 'revoked':
                                    case 'rejected':
                                        actionButton = (
                                            <button onClick={() => handleRequestPartnership(ally.id)} disabled={isLoading} className="button-primary" style={{width: '100%', justifyContent: 'center', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem'}}> 
                                                {isLoading ? '...' : 'Re-conectar'} 
                                            </button>
                                        );
                                        break;
                                    default:
                                        actionButton = (
                                            <button onClick={() => handleRequestPartnership(ally.id)} disabled={isLoading} className="button-primary" style={{width: '100%', justifyContent: 'center', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem'}}> 
                                                {isLoading ? 'Enviando...' : 'Conectar'} 
                                            </button>
                                        );
                                }
                            }

                            return (
                                <CatalogCard
                                    key={ally.id}
                                    title={ally.full_name}
                                    subtitle={ally.specialty}
                                    description={ally.office_address ? `${ally.office_address}` : 'Ubicación no disponible'}
                                    avatarSrc={ally.avatar_url}
                                    avatarSeed={ally.full_name}
                                    headerGradientSeed={ally.full_name}
                                    overlayBadge={isMyProfile ? 'TÚ' : status === 'active' ? 'VINCULADO' : undefined}
                                    onImageClick={() => setViewingAlly(ally)}
                                    actions={
                                        <>
                                            {actionButton}
                                            <button onClick={() => setViewingAlly(ally)} style={{width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'}}>
                                                Ver Detalles
                                            </button>
                                        </>
                                    }
                                />
                            )
                        })}
                    </div>
                    
                    {filteredAllies.length === 0 && (
                         <div style={{textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)'}}>
                             <p>No se encontraron profesionales con estos criterios.</p>
                         </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllyDirectoryPage;
