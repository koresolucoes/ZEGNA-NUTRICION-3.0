import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Ally } from '../../types';

type PartnershipStatusMap = { [allyId: string]: 'pending' | 'active' | 'revoked' | 'rejected' | 'none' };

const AllyDirectoryPage: FC<{ navigate: (page: string) => void }> = ({ navigate }) => {
    const [allies, setAllies] = useState<Ally[]>([]);
    const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatusMap>({});
    const [myId, setMyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading'>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError) throw allyIdError;
            setMyId(allyIdData);

            const [alliesRes, partnershipsRes] = await Promise.all([
                supabase.from('allies').select('*').order('full_name'),
                supabase.from('ally_ally_partnerships').select('*').or(`requester_id.eq.${allyIdData},responder_id.eq.${allyIdData}`)
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
        setRequestStatus(prev => ({...prev, [responderId]: 'loading'}));
        
        const { error: rpcError } = await supabase.rpc('request_ally_partnership', {
            p_responder_id: responderId
        });
        
        setRequestStatus(prev => ({...prev, [responderId]: 'idle'}));

        if (rpcError) {
            setError(`Error al enviar solicitud: ${rpcError.message}`);
        } else {
            setPartnershipStatus(prev => ({ ...prev, [responderId]: 'pending' }));
        }
    };
    
    const filteredAllies = allies.filter(ally => 
        ally.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ally.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            <div style={{...styles.pageHeader, marginBottom: '0.25rem'}}>
                <h1>Directorio de Aliados</h1>
            </div>
            <p style={{marginTop: 0, color: 'var(--text-light)', maxWidth: '800px'}}>
                Encuentra y conecta con otros profesionales de la salud en la red Zegna.
            </p>

            <div style={{...styles.filterBar, maxWidth: '500px'}}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input type="text" placeholder="Buscar por nombre o especialidad..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
            </div>

            {loading && <p>Cargando directorio...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && (
                <div className="info-grid" style={{marginTop: '1.5rem'}}>
                    {filteredAllies.map(ally => {
                        const isMyProfile = ally.id === myId;
                        const status = partnershipStatus[ally.id];
                        const isLoading = requestStatus[ally.id] === 'loading';
                        
                        let actionButton;
                        if (isMyProfile) {
                            actionButton = <button onClick={() => navigate('profile')} className="button-secondary" style={{display: 'flex', gap: '0.5rem'}}> {ICONS.edit} <span>Editar Perfil</span> </button>;
                        } else {
                            switch(status) {
                                case 'active':
                                    actionButton = <button disabled> {ICONS.check} Vinculado </button>;
                                    break;
                                case 'pending':
                                    actionButton = <button disabled className="button-secondary"> {ICONS.clock} Pendiente </button>;
                                    break;
                                case 'revoked':
                                case 'rejected':
                                    actionButton = <button onClick={() => handleRequestPartnership(ally.id)} disabled={isLoading}> {isLoading ? '...' : 'Re-solicitar'} </button>;
                                    break;
                                default:
                                    actionButton = <button onClick={() => handleRequestPartnership(ally.id)} disabled={isLoading} className="button-secondary"> {isLoading ? '...' : 'Conectar'} </button>;
                            }
                        }

                        return (
                            <div key={ally.id} className="info-card" style={{position: 'relative'}}>
                                {isMyProfile && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        TÚ
                                    </span>
                                )}
                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flex: 1}}>
                                    <img src={ally.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${ally.full_name || '?'}&radius=50`} alt="avatar" style={{width: '48px', height: '48px', borderRadius: '50%'}}/>
                                    <div>
                                        <h4 style={{margin: 0, color: 'var(--primary-color)'}}>{ally.full_name}</h4>
                                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>{ally.specialty}</p>
                                    </div>
                                </div>
                                <div className="card-actions" style={{opacity: 1}}>
                                    {actionButton}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default AllyDirectoryPage;