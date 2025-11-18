import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Clinic } from '../../types';
import ClinicDetailsModal from '../../components/ally_portal/ClinicDetailsModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

// Define a type for partnership status for easier mapping
type PartnershipStatusMap = { [clinicId: string]: 'pending' | 'active' | 'revoked' | 'none' };

const AllyClinicDirectoryPage: FC = () => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatusMap>({});
    const [allyId, setAllyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading'>>({});
    const [viewingClinic, setViewingClinic] = useState<Clinic | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Step 1: Get current ally's ID
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError) throw allyIdError;
            setAllyId(allyIdData);

            // Step 2: Fetch all clinics and the ally's partnerships in parallel
            const [clinicsRes, partnershipsRes] = await Promise.all([
                supabase.from('clinics').select('*').order('name'),
                supabase.from('clinic_ally_partnerships').select('clinic_id, status').eq('ally_id', allyIdData)
            ]);
            
            if (clinicsRes.error) throw clinicsRes.error;
            if (partnershipsRes.error) throw partnershipsRes.error;

            setClinics(clinicsRes.data as unknown as Clinic[] || []);

            // Step 3: Create a map of partnership statuses for quick lookup
            const statusMap: PartnershipStatusMap = {};
            (partnershipsRes.data || []).forEach(p => {
                statusMap[p.clinic_id] = p.status as 'pending' | 'active' | 'revoked';
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

    const handleRequestPartnership = async (clinicId: string) => {
        if (!allyId) return;
        setRequestStatus(prev => ({...prev, [clinicId]: 'loading'}));
        
        const { error: rpcError } = await supabase.rpc('request_partnership_from_ally', {
            p_clinic_id: clinicId
        });
        
        setRequestStatus(prev => ({...prev, [clinicId]: 'idle'}));

        if (rpcError) {
            setError(`Error al enviar solicitud: ${rpcError.message}`);
        } else {
            // Optimistically update UI and send notification
            setPartnershipStatus(prev => ({ ...prev, [clinicId]: 'pending' }));
            
            // Send notification to the clinic owner
            try {
                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('owner_id, name')
                    .eq('id', clinicId)
                    .single();
                
                const { data: allyData } = await supabase
                    .from('allies')
                    .select('full_name')
                    .eq('id', allyId)
                    .single();

                if (clinicData && clinicData.owner_id && allyData) {
                    fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: clinicData.owner_id,
                            title: 'Nueva Solicitud de Vínculo',
                            body: `${allyData.full_name} quiere colaborar con tu clínica ${clinicData.name}.`
                        })
                    }).catch(err => console.error("Failed to send notification:", err));
                }
            } catch (e) {
                console.error("Could not send partnership request notification", e);
            }
        }
    };
    
    const filteredClinics = clinics.filter(clinic => 
        clinic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const actionButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: 'var(--text-light)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5rem',
        borderRadius: '8px',
        flex: 1,
        fontSize: '0.75rem',
        textAlign: 'center',
        lineHeight: 1.2
    };

    return (
        <div className="fade-in">
             {viewingClinic && (
                <ClinicDetailsModal
                    isOpen={!!viewingClinic}
                    onClose={() => setViewingClinic(null)}
                    clinic={viewingClinic}
                />
            )}
            <div style={{...styles.pageHeader, marginBottom: '0.25rem'}}>
                <h1>Directorio de Clínicas</h1>
            </div>
            <p style={{marginTop: 0, color: 'var(--text-light)', maxWidth: '800px'}}>
                Explora las clínicas disponibles en la red. Solicita un vínculo para empezar a recibir y enviar referidos.
            </p>

            <div style={{...styles.filterBar, maxWidth: '500px'}}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input type="text" placeholder="Buscar por nombre o dirección..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
            </div>

            {loading && <SkeletonLoader type="card" count={6} />}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && (
                <div className="info-grid" style={{marginTop: '1.5rem'}}>
                    {filteredClinics.map(clinic => {
                         const status = partnershipStatus[clinic.id];
                         const isLoading = requestStatus[clinic.id] === 'loading';
                         
                         let statusButton;
                         switch(status) {
                             case 'active':
                                 statusButton = <button disabled style={{...actionButtonStyle, opacity: 0.7}}> {ICONS.check} <span>Vinculado</span> </button>;
                                 break;
                             case 'pending':
                                 statusButton = <button disabled style={{...actionButtonStyle, opacity: 0.7}}> {ICONS.clock} <span>Pendiente</span> </button>;
                                 break;
                             case 'revoked':
                                 statusButton = <button onClick={() => handleRequestPartnership(clinic.id)} disabled={isLoading} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover"> {isLoading ? ICONS.clock : ICONS.add} <span>Re-solicitar</span> </button>;
                                 break;
                             default:
                                 statusButton = <button onClick={() => handleRequestPartnership(clinic.id)} disabled={isLoading} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover"> {isLoading ? ICONS.clock : ICONS.network} <span>Vincular</span> </button>;
                         }

                        return (
                            <div key={clinic.id} className="info-card" style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 0}}>
                                <div style={{padding: '1rem', flex: 1}}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <img 
                                            src={clinic.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic.name?.charAt(0) || 'C'}&radius=50`} 
                                            alt="logo" 
                                            style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} 
                                        />
                                        <div style={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
                                            <h4 style={{ margin: 0, color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinic.name}</h4>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinic.address}</p>
                                        </div>
                                    </div>
                                    {(clinic.phone_number || clinic.email || clinic.website) && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                            {clinic.phone_number && <span style={{display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.phone}{clinic.phone_number}</span>}
                                            {clinic.email && <a href={`mailto:${clinic.email}`} style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.send}{clinic.email}</a>}
                                            {clinic.website && <a href={clinic.website} target="_blank" rel="noopener noreferrer" style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.link}Sitio Web</a>}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.5rem' }}>
                                    {statusButton}
                                    <button onClick={() => setViewingClinic(clinic)} style={actionButtonStyle} className="nav-item-hover">
                                        {ICONS.details}
                                        <span>Detalles</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filteredClinics.length === 0 && <p>No se encontraron clínicas con ese criterio de búsqueda.</p>}
                </div>
            )}
        </div>
    );
};

export default AllyClinicDirectoryPage;