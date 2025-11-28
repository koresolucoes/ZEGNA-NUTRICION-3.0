
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
            // Optimistically update UI
            setPartnershipStatus(prev => ({ ...prev, [clinicId]: 'pending' }));
            
            // Send notification (optimistic fire-and-forget)
            try {
                const { data: clinicData } = await supabase.from('clinics').select('owner_id, name').eq('id', clinicId).single();
                const { data: allyData } = await supabase.from('allies').select('full_name').eq('id', allyId).single();

                if (clinicData?.owner_id && allyData) {
                    fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: clinicData.owner_id,
                            title: 'Nueva Solicitud de Vínculo',
                            body: `${allyData.full_name} quiere colaborar con tu clínica ${clinicData.name}.`
                        })
                    }).catch(console.error);
                }
            } catch (e) { console.error(e); }
        }
    };
    
    const filteredClinics = clinics.filter(clinic => 
        clinic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
             {viewingClinic && (
                <ClinicDetailsModal
                    isOpen={!!viewingClinic}
                    onClose={() => setViewingClinic(null)}
                    clinic={viewingClinic}
                />
            )}
            <div style={{marginBottom: '2.5rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Directorio de Clínicas</h1>
                <p style={{ margin: 0, color: 'var(--text-light)', maxWidth: '700px' }}>
                    Descubre centros de salud para colaborar y ampliar tus servicios.
                </p>
            </div>

            <div style={{...styles.filterBar, maxWidth: '500px', marginBottom: '2rem', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none'}}>
                <div style={{...styles.searchInputContainer, flex: 1}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar clínica por nombre o ubicación..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{...styles.searchInput, height: '50px', borderRadius: '12px', fontSize: '1rem', paddingLeft: '2.5rem'}} 
                    />
                </div>
            </div>

            {loading && <SkeletonLoader type="card" count={6} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div className="info-grid">
                    {filteredClinics.map(clinic => {
                         const status = partnershipStatus[clinic.id];
                         const isLoading = requestStatus[clinic.id] === 'loading';
                         
                         let statusIndicator = null;
                         let actionButton = null;

                         if (status === 'active') {
                             statusIndicator = <span style={{color: '#10B981', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>{ICONS.check} Vinculado</span>;
                             actionButton = <button onClick={() => setViewingClinic(clinic)} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', fontWeight: 600}}>Ver Detalles</button>;
                         } else if (status === 'pending') {
                             statusIndicator = <span style={{color: '#EAB308', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>⏳ Pendiente</span>;
                             actionButton = <button disabled style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)', cursor: 'default'}}>Solicitud Enviada</button>;
                         } else {
                             // None or Revoked
                             actionButton = (
                                 <button 
                                    onClick={() => handleRequestPartnership(clinic.id)} 
                                    disabled={isLoading}
                                    className="button-primary"
                                    style={{flex: 1, padding: '0.6rem', fontSize: '0.9rem'}}
                                 >
                                    {isLoading ? 'Enviando...' : 'Conectar'}
                                 </button>
                             );
                         }

                        return (
                            <div key={clinic.id} className="card-hover" style={{
                                backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{padding: '1.5rem', flex: 1}}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <img 
                                            src={clinic.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic.name?.charAt(0) || 'C'}&radius=50`} 
                                            alt="logo" 
                                            style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-hover-color)'}} 
                                        />
                                        {statusIndicator}
                                    </div>
                                    
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)', lineHeight: 1.2 }}>{clinic.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                                        {clinic.address || 'Ubicación no disponible'}
                                    </p>
                                    
                                    {(clinic.phone_number || clinic.website) && (
                                        <div style={{marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--primary-color)'}}>
                                            {clinic.website && <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>{ICONS.link} Web</span>}
                                            {clinic.phone_number && <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>{ICONS.phone} Tel</span>}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
                                    <button onClick={() => setViewingClinic(clinic)} style={{padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer'}}>
                                        Info
                                    </button>
                                    {actionButton}
                                </div>
                            </div>
                        )
                    })}
                    {filteredClinics.length === 0 && (
                        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                            <p style={{fontSize: '1.1rem'}}>No se encontraron clínicas.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllyClinicDirectoryPage;
