import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { AffiliateProgram, PopulatedAffiliateLink, PopulatedAffiliateEvent } from '../types';
import FinancialSummaryCard from '../components/finanzas/FinancialSummaryCard';

const ProgramCard: FC<{
    program: AffiliateProgram;
    link?: PopulatedAffiliateLink;
    onJoin: (programId: string) => void;
    isJoining: boolean;
}> = ({ program, link, onJoin, isJoining }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const referralLink = link ? `${window.location.origin}/#/?ref=${link.code}` : '';

    const handleCopy = (text: string, type: 'code' | 'link') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(type);
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };
    
    const rewardText = useMemo(() => {
        if (program.reward_type === 'monetary_commission') {
            return `$${program.reward_value} MXN por cada suscripción`;
        }
        return `${program.reward_value} créditos de servicio`;
    }, [program]);

    // New styles for the card
    const cardStyle: React.CSSProperties = {
        ...styles.infoCard, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        padding: '1.5rem',
        justifyContent: 'space-between',
    };
    
    const codeBlockStyle: React.CSSProperties = {
        backgroundColor: 'var(--background-color)',
        padding: '1rem',
        borderRadius: '8px',
        marginTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    };
    
    const codeRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };
    
    const inputStyle: React.CSSProperties = {
        flex: 1,
        margin: 0,
        backgroundColor: 'var(--surface-color)',
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    };

    return (
        <div style={cardStyle}>
            <div>
                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--primary-color)'}}>{program.name}</h3>
                <p style={{margin: 0, color: 'var(--text-light)', minHeight: '3em'}}>{program.description}</p>
            </div>

            <div>
                <div style={{borderTop: `1px solid var(--border-color)`, paddingTop: '1rem', marginTop: '1rem'}}>
                     <p style={{margin: 0, fontWeight: 600}}>Recompensa: <span style={{color: 'var(--primary-color)'}}>{rewardText}</span></p>
                </div>
                
                {link ? (
                    <div style={codeBlockStyle}>
                        <div>
                            <label style={{fontSize: '0.8rem'}}>Tu Código Único</label>
                            <div style={codeRowStyle}>
                                <input type="text" readOnly value={link.code} onClick={() => handleCopy(link.code, 'code')} style={{...inputStyle, fontFamily: 'monospace', fontWeight: 'bold' }}/>
                                <button type="button" onClick={() => handleCopy(link.code, 'code')} className="button-secondary" style={{padding: '10px 12px'}}>
                                    {copySuccess === 'code' ? 'Copiado' : ICONS.copy}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{fontSize: '0.8rem'}}>Tu Enlace de Registro</label>
                            <div style={codeRowStyle}>
                                <input type="text" readOnly value={referralLink} onClick={() => handleCopy(referralLink, 'link')} style={inputStyle}/>
                                <button type="button" onClick={() => handleCopy(referralLink, 'link')} className="button-secondary" style={{padding: '10px 12px'}}>
                                    {copySuccess === 'link' ? 'Copiado' : ICONS.copy}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => onJoin(program.id)} disabled={isJoining} style={{marginTop: '1rem', width: '100%'}}>
                        {isJoining ? 'Generando...' : 'Obtener mi enlace'}
                    </button>
                )}
            </div>
        </div>
    );
};


const AffiliatesPage: FC<{ navigate: (page: string, context?: any) => void; }> = ({ navigate }) => {
    const [myLinks, setMyLinks] = useState<PopulatedAffiliateLink[]>([]);
    const [allPrograms, setAllPrograms] = useState<AffiliateProgram[]>([]);
    const [events, setEvents] = useState<PopulatedAffiliateEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");

            const [linksRes, programsRes] = await Promise.all([
                supabase.from('affiliate_links').select('*, affiliate_programs(*)').eq('user_id', user.id),
                supabase.from('affiliate_programs').select('*').eq('is_active', true).order('created_at')
            ]);
            
            if (linksRes.error) throw linksRes.error;
            if (programsRes.error) throw programsRes.error;

            const userLinks = (linksRes.data as PopulatedAffiliateLink[]) || [];
            setMyLinks(userLinks);
            setAllPrograms(programsRes.data || []);
            
            if (userLinks.length > 0) {
                const linkIds = userLinks.map(l => l.id);
                const { data: eventsData, error: eventsError } = await supabase
                    .from('affiliate_events')
                    .select('*, clinics(name)')
                    .in('affiliate_link_id', linkIds)
                    .order('created_at', { ascending: false });
                if (eventsError) throw eventsError;
                setEvents((eventsData as any) || []);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleJoinProgram = async (programId: string) => {
        setActionLoading(programId);
        setError(null);
        try {
            const { error } = await supabase.rpc('create_user_affiliate_link', { p_program_id: programId });
            if (error) throw error;
            fetchData(); // Refetch everything to update the UI
        } catch (err: any) {
            setError(`Error al unirse al programa: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const stats = useMemo(() => {
        const totalClicks = myLinks.reduce((sum, link) => sum + link.clicks, 0);
        const approvedEvents = events.filter(e => e.status === 'approved');
        const paidEvents = events.filter(e => e.status === 'paid');

        const pendingCommission = approvedEvents.reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
        const totalPaidCommission = paidEvents.reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
        
        return {
            totalClicks,
            registrations: events.length,
            pendingCommission,
            totalPaidCommission
        };
    }, [events, myLinks]);
    
     const unjoinedPrograms = useMemo(() => {
        const joinedProgramIds = new Set(myLinks.map(l => l.program_id));
        return allPrograms.filter(p => !joinedProgramIds.has(p.id));
    }, [myLinks, allPrograms]);

    if (loading) return <p>Cargando programa de afiliados...</p>;
    if (error) return <p style={styles.error}>{error}</p>;

    if (myLinks.length === 0) {
        return (
            <div className="fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
                <div style={{textAlign: 'center'}}>
                    <h1 style={{...styles.modalTitle, margin: '0 0 1rem 0'}}>Programa de Afiliados de Zegna</h1>
                    <p style={{color: 'var(--text-light)', marginBottom: '2rem'}}>
                        ¡Bienvenido! Gana recompensas por cada nueva clínica que traigas a la plataforma. 
                        Elige un programa para obtener tu enlace de referido único y comenzar a compartir.
                    </p>
                </div>
                <div className="info-grid">
                    {allPrograms.map(program => (
                        <ProgramCard 
                            key={program.id}
                            program={program}
                            onJoin={handleJoinProgram}
                            isJoining={actionLoading === program.id}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={styles.pageHeader}><h1>Portal de Afiliados</h1></div>

            <section>
                <h2 style={{ fontSize: '1.5rem' }}>Tus Programas y Enlaces</h2>
                <div className="info-grid">
                    {myLinks.map(link => link.affiliate_programs && (
                        <ProgramCard 
                            key={link.id}
                            program={link.affiliate_programs}
                            link={link}
                            onJoin={() => {}} // Should not be called in this mode
                            isJoining={false}
                        />
                    ))}
                </div>
            </section>
            
            <section style={{marginTop: '2rem'}}>
                <h2 style={{ fontSize: '1.5rem' }}>Rendimiento General</h2>
                <div style={{...styles.dashboardGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem'}}>
                    <FinancialSummaryCard title="Clics en tus Enlaces" value={stats.totalClicks.toString()} icon={ICONS.activity} />
                    <FinancialSummaryCard title="Clínicas Registradas" value={stats.registrations.toString()} icon={ICONS.users} />
                    <FinancialSummaryCard title="Ganancias Pendientes" value={`$${stats.pendingCommission.toFixed(2)}`} icon={ICONS.clock} />
                    <FinancialSummaryCard title="Ganancias Totales Pagadas" value={`$${stats.totalPaidCommission.toFixed(2)}`} icon={ICONS.dollar} />
                </div>
            </section>

            <section>
                <h2 style={{ fontSize: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '2rem' }}>Clínicas Referidas</h2>
                <div style={styles.tableContainer}>
                    {events.length === 0 ? <p style={{padding: '2rem', textAlign: 'center'}}>Aún no tienes clínicas referidas.</p> :
                    (
                        <table style={styles.table}>
                            <thead><tr>
                                <th style={styles.th}>Clínica Referida</th><th style={styles.th}>Fecha de Registro</th><th style={{...styles.th, textAlign: 'right'}}>Comisión</th><th style={styles.th}>Estado</th>
                            </tr></thead>
                            <tbody>{events.map(e => (
                                    <tr key={e.id} className="table-row-hover">
                                        <td style={styles.td}>{e.clinics?.name || 'Clínica Eliminada'}</td>
                                        <td style={styles.td}>{new Date(e.created_at).toLocaleDateString('es-MX')}</td>
                                        <td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>${parseFloat(String(e.commission_amount || 0)).toFixed(2)}</td>
                                        <td style={styles.td}><span style={{textTransform: 'capitalize'}}>{e.status}</span></td>
                                    </tr>
                                )
                            )}</tbody>
                        </table>
                    )}
                </div>
            </section>

            {unjoinedPrograms.length > 0 && (
                 <section style={{marginTop: '2rem'}}>
                    <h2 style={{ fontSize: '1.5rem' }}>Descubre Otros Programas</h2>
                    <div className="info-grid">
                        {unjoinedPrograms.map(program => (
                            <ProgramCard 
                                key={program.id}
                                program={program}
                                onJoin={handleJoinProgram}
                                isJoining={actionLoading === program.id}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default AffiliatesPage;