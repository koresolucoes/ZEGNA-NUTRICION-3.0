
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Clinic } from '../../types';
import ClinicDetailsModal from '../../components/ally_portal/ClinicDetailsModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import CatalogCard from '../../components/shared/CatalogCard';

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

    const actionButtonStyle = (primary: boolean = false): React.CSSProperties => ({
        width: '100%',
        padding: '0.6rem',
        borderRadius: '8px',
        border: primary ? 'none' : '1px solid var(--border-color)',
        cursor: primary ? 'pointer' : 'default',
        fontSize: '0.85rem',
        fontWeight: 600,
        backgroundColor: primary ? 'var(--primary-color)' : 'var(--surface-hover-color)',
        color: primary ? 'white' : 'var(--text-light)',
        transition: 'all 0.2s'
    });

    return (
        <div className="fade-in" style={{maxWidth: '1200px', margin: '0 auto'}}>
             {viewingClinic && (
                <ClinicDetailsModal
                    isOpen={!!viewingClinic}
                    onClose={() => setViewingClinic(null)}
                    clinic={viewingClinic}
                />
            )}
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Centros de Salud</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Conecta con clínicas para recibir referidos y expandir tu práctica.
                </p>
            </div>

            {/* Search Filter */}
            <div style={{
                backgroundColor: 'var(--surface-color)', 
                padding: '1rem', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)',
                marginBottom: '2rem',
            }}>
                <div style={{...styles.searchInputContainer, width: '100%', maxWidth: '500px'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o ubicación..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{...styles.searchInput, height: '42px', backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)', fontSize: '1rem'}} 
                    />
                </div>
            </div>

            {loading && <SkeletonLoader type="card" count={6} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem'}}>
                        {filteredClinics.length} clínica{filteredClinics.length !== 1 ? 's' : ''} disponible{filteredClinics.length !== 1 ? 's' : ''}
                    </p>

                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredClinics.map(clinic => {
                             const status = partnershipStatus[clinic.id];
                             const isLoading = requestStatus[clinic.id] === 'loading';
                             
                             let actionButton = null;

                             if (status === 'active') {
                                 actionButton = <button disabled style={{...actionButtonStyle(), backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC'}}>{ICONS.check} Vinculado</button>;
                             } else if (status === 'pending') {
                                 actionButton = <button disabled style={actionButtonStyle()}>{ICONS.clock} Pendiente</button>;
                             } else {
                                 actionButton = (
                                     <button 
                                        onClick={() => handleRequestPartnership(clinic.id)} 
                                        disabled={isLoading}
                                        className="button-primary"
                                        style={{width: '100%', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem'}}
                                     >
                                        {isLoading ? 'Enviando...' : 'Conectar'}
                                     </button>
                                 );
                             }

                            return (
                                <CatalogCard
                                    key={clinic.id}
                                    title={clinic.name}
                                    subtitle={clinic.address || 'Sin dirección'}
                                    avatarSrc={clinic.logo_url}
                                    avatarSeed={clinic.name}
                                    headerGradientSeed={clinic.name}
                                    overlayBadge={status === 'active' ? 'VINCULADO' : undefined}
                                    onImageClick={() => setViewingClinic(clinic)}
                                    children={
                                        <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--primary-color)'}}>
                                            {clinic.phone_number && <span title={clinic.phone_number}>{ICONS.phone}</span>}
                                            {clinic.website && <span title={clinic.website}>{ICONS.link}</span>}
                                            {clinic.email && <span title={clinic.email}>{ICONS.send}</span>}
                                        </div>
                                    }
                                    actions={
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%'}}>
                                            {actionButton}
                                            <button onClick={() => setViewingClinic(clinic)} style={{width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'}}>
                                                Ver Detalles
                                            </button>
                                        </div>
                                    }
                                />
                            )
                        })}
                    </div>
                    
                    {filteredClinics.length === 0 && (
                        <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                            <p style={{fontSize: '1.1rem'}}>No se encontraron clínicas.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllyClinicDirectoryPage;
