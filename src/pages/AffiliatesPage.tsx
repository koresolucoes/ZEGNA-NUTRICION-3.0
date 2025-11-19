
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { AffiliateProgram, PopulatedAffiliateLink, PopulatedAffiliateEvent } from '../types';
import FinancialSummaryCard from '../components/finanzas/FinancialSummaryCard';
import SkeletonLoader from '../components/shared/SkeletonLoader';

// --- Helper Components ---

const StatusBadge: FC<{ status: string }> = ({ status }) => {
    const config: any = {
        pending: { color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)', label: 'Pendiente', icon: '⏳' },
        approved: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Aprobado', icon: '✅' },
        paid: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', label: 'Pagado', icon: '💵' },
        rejected: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Rechazado', icon: '❌' }
    };

    const style = config[status] || { color: 'var(--text-light)', bg: 'var(--surface-hover-color)', label: status, icon: '' };

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: style.bg,
            color: style.color,
            border: `1px solid ${style.color}30` // 30% opacity border
        }}>
            <span>{style.icon}</span>
            <span style={{textTransform: 'capitalize'}}>{style.label}</span>
        </span>
    );
};

const StepCard: FC<{ icon: React.ReactNode, title: string, desc: string, number: number }> = ({ icon, title, desc, number }) => (
    <div style={{
        flex: 1,
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '0.5rem'
    }}>
        <div style={{
            position: 'absolute', top: '-10px', right: '-10px', fontSize: '4rem', fontWeight: 800, 
            color: 'var(--text-color)', opacity: 0.03, lineHeight: 1
        }}>{number}</div>
        
        <div style={{
            width: '48px', height: '48px', borderRadius: '50%', 
            backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
            marginBottom: '0.5rem'
        }}>
            {icon}
        </div>
        <h4 style={{margin: 0, fontWeight: 600, color: 'var(--text-color)'}}>{title}</h4>
        <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.5}}>{desc}</p>
    </div>
);

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
            return `$${program.reward_value} MXN`;
        }
        return `${program.reward_value} Créditos`;
    }, [program]);

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        padding: '0',
        overflow: 'hidden',
        transition: 'transform 0.2s ease',
    };

    const headerStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
        padding: '1.5rem',
        color: 'white'
    };

    const bodyStyle: React.CSSProperties = {
        padding: '1.5rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    };

    const inputGroupStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--background-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '4px',
        marginTop: '0.5rem'
    };
    
    const inputStyle: React.CSSProperties = {
        flex: 1,
        margin: 0,
        border: 'none',
        background: 'transparent',
        padding: '8px',
        fontSize: '0.9rem',
        color: 'var(--text-color)',
        outline: 'none',
        fontFamily: 'monospace'
    };

    return (
        <div style={cardStyle} className="card-hover">
            <div style={headerStyle}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                    <div style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(5px)'}}>
                        PROGRAMA ACTIVO
                    </div>
                    <span style={{fontSize: '1.5rem'}}>🚀</span>
                </div>
                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800}}>{program.name}</h3>
                <p style={{margin: 0, opacity: 0.9, fontSize: '0.9rem', lineHeight: 1.5}}>{program.description}</p>
            </div>

            <div style={bodyStyle}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <p style={{margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600}}>Recompensa</p>
                        <p style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)'}}>{rewardText}</p>
                        <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>por cada clínica referida</p>
                    </div>
                    <div style={{width: '1px', height: '40px', backgroundColor: 'var(--border-color)'}}></div>
                    <div style={{flex: 1, paddingLeft: '1rem'}}>
                         <p style={{margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600}}>Validez</p>
                         <p style={{margin: 0, fontSize: '1rem', fontWeight: 600}}>Ilimitada</p>
                    </div>
                </div>
                
                {link ? (
                    <div style={{marginTop: '0.5rem'}}>
                        <div>
                            <label style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)'}}>Tu Enlace de Registro</label>
                            <div style={inputGroupStyle}>
                                <input type="text" readOnly value={referralLink} onClick={() => handleCopy(referralLink, 'link')} style={{...inputStyle, color: 'var(--primary-color)'}}/>
                                <button type="button" onClick={() => handleCopy(referralLink, 'link')} style={{background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: copySuccess === 'link' ? 'var(--primary-color)' : 'var(--text-color)'}}>
                                    {copySuccess === 'link' ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>
                        
                        <div style={{marginTop: '1rem'}}>
                            <label style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)'}}>Tu Código Manual</label>
                            <div style={inputGroupStyle}>
                                <input type="text" readOnly value={link.code} onClick={() => handleCopy(link.code, 'code')} style={{...inputStyle, fontWeight: 800, letterSpacing: '1px'}}/>
                                <button type="button" onClick={() => handleCopy(link.code, 'code')} style={{background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: copySuccess === 'code' ? 'var(--primary-color)' : 'var(--text-color)'}}>
                                    {copySuccess === 'code' ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => onJoin(program.id)} disabled={isJoining} className="button-primary" style={{marginTop: '1rem', width: '100%', padding: '0.8rem', borderRadius: '12px', fontSize: '1rem'}}>
                        {isJoining ? 'Generando enlace...' : '¡Quiero Unirme!'}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Main Page ---

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
            fetchData(); 
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

    // --- UI Render ---

    if (loading && allPrograms.length === 0) return <div className="fade-in" style={{padding: '2rem'}}><SkeletonLoader type="card" count={3} /></div>;
    if (error) return <p style={styles.error}>{error}</p>;

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            
            <div style={{textAlign: 'center', marginBottom: '3rem', padding: '2rem', background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--surface-hover-color) 100%)', borderRadius: '24px', border: '1px solid var(--border-color)'}}>
                <h1 style={{fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem 0'}}>Programa de Afiliados</h1>
                <p style={{color: 'var(--text-light)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto'}}>
                    Comparte el éxito de Zegna. Gana comisiones refiriendo a otras clínicas y profesionales a nuestra plataforma.
                </p>
            </div>

            {/* How it Works */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem'}}>
                <StepCard number={1} icon={ICONS.link} title="Obtén tu Enlace" desc="Únete a un programa y recibe tu enlace único de referido." />
                <StepCard number={2} icon={ICONS.send} title="Comparte" desc="Envía tu enlace a colegas o publícalo en tus redes." />
                <StepCard number={3} icon={ICONS.dollar} title="Gana Comisiones" desc="Recibe dinero cuando tus referidos se suscriban a un plan." />
            </div>

            {/* Programs Section */}
            {myLinks.length === 0 && unjoinedPrograms.length === 0 ? (
                <div style={{textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                    <p>No hay programas de afiliados activos en este momento.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                     {/* Joined Programs */}
                    {myLinks.map(link => link.affiliate_programs && (
                        <ProgramCard 
                            key={link.id}
                            program={link.affiliate_programs}
                            link={link}
                            onJoin={() => {}}
                            isJoining={false}
                        />
                    ))}
                    {/* Unjoined Programs */}
                    {unjoinedPrograms.map(program => (
                         <ProgramCard 
                            key={program.id}
                            program={program}
                            onJoin={handleJoinProgram}
                            isJoining={actionLoading === program.id}
                        />
                    ))}
                </div>
            )}
            
            {/* Dashboard Stats */}
            {myLinks.length > 0 && (
                <>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--primary-color)' }}>Tu Rendimiento</h2>
                    <div style={{...styles.dashboardGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '3rem'}}>
                        <FinancialSummaryCard title="Clics Totales" value={stats.totalClicks.toString()} icon={ICONS.activity} />
                        <FinancialSummaryCard title="Registros Exitosos" value={stats.registrations.toString()} icon={ICONS.users} />
                        <FinancialSummaryCard title="Comisiones Pendientes" value={`$${stats.pendingCommission.toFixed(2)}`} icon={ICONS.clock} />
                        <FinancialSummaryCard title="Total Pagado" value={`$${stats.totalPaidCommission.toFixed(2)}`} icon={ICONS.dollar} />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--primary-color)' }}>Historial de Referidos</h2>
                    <div style={styles.tableContainer}>
                        {events.length === 0 ? (
                            <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-light)'}}>
                                <div style={{fontSize: '2rem', marginBottom: '1rem', opacity: 0.5}}>📭</div>
                                <p>Aún no se han registrado clínicas con tu enlace.</p>
                            </div>
                        ) : (
                            <table style={styles.table}>
                                <thead><tr>
                                    <th style={styles.th}>Clínica</th>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={{...styles.th, textAlign: 'right'}}>Comisión</th>
                                    <th style={styles.th}>Estado</th>
                                </tr></thead>
                                <tbody>{events.map(e => (
                                        <tr key={e.id} className="table-row-hover">
                                            <td style={styles.td}>
                                                <div style={{fontWeight: 600, color: 'var(--text-color)'}}>{e.clinics?.name || 'Desconocida'}</div>
                                            </td>
                                            <td style={styles.td}>{new Date(e.created_at).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                            <td style={{...styles.td, textAlign: 'right', fontWeight: 600, color: e.status === 'paid' || e.status === 'approved' ? 'var(--primary-color)' : 'var(--text-light)'}}>
                                                ${parseFloat(String(e.commission_amount || 0)).toFixed(2)}
                                            </td>
                                            <td style={styles.td}><StatusBadge status={e.status} /></td>
                                        </tr>
                                    )
                                )}</tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AffiliatesPage;
