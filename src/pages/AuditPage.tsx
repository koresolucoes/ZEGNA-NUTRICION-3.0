
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import { Log, TeamMember } from '../types';
import SkeletonLoader from '../components/shared/SkeletonLoader';

interface ExtendedLog extends Log {
    person_name?: string;
    professional_name?: string;
}

const PAGE_SIZE = 20;

const AuditPage: FC<{ isMobile: boolean }> = ({ isMobile }) => {
    const { clinic } = useClinic();
    const [logs, setLogs] = useState<ExtendedLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [logType, setLogType] = useState('all');
    const [professionalId, setProfessionalId] = useState('all');
    
    // Derived Search Term for Client Name (Optional enhancement)
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Log Types options
    const logTypes = ['all', 'Nota de Consulta', 'Plan Alimenticio (IA)', 'Rutina de Ejercicio (IA)', 'AUDITORÍA', 'General'];

    const fetchTeamMembers = useCallback(async () => {
        if (!clinic) return;
        const { data } = await supabase.from('team_members_with_profiles').select('user_id, full_name').eq('clinic_id', clinic.id);
        setTeamMembers(data || []);
    }, [clinic]);

    useEffect(() => {
        fetchTeamMembers();
    }, [fetchTeamMembers]);

    const buildQuery = () => {
        // Shared query builder for fetch and export
        let query = supabase
            .from('logs')
            .select('*, persons!inner(clinic_id, full_name)')
            .eq('persons.clinic_id', clinic!.id)
            .order('created_at', { ascending: false });

        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
        
        if (logType !== 'all') {
            if (logType === 'General') {
                 query = query.eq('log_type', 'General');
            } else {
                query = query.eq('log_type', logType);
            }
        }

        if (professionalId !== 'all') {
            query = query.eq('created_by_user_id', professionalId);
        }
        
        if (debouncedSearchTerm) {
            query = query.ilike('persons.full_name', `%${debouncedSearchTerm}%`);
        }
        
        return query;
    };

    const fetchLogs = useCallback(async (isLoadMore = false) => {
        if (!clinic) return;
        
        const currentPage = isLoadMore ? page + 1 : 0;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const query = buildQuery();
            const { data, error } = await query.range(from, to);

            if (error) throw error;

            // Map data to include names
            const mappedData: ExtendedLog[] = (data || []).map((item: any) => ({
                ...item,
                person_name: item.persons?.full_name || 'Desconocido',
                // Look up professional name from pre-fetched team list
                professional_name: teamMembers.find(t => t.user_id === item.created_by_user_id)?.full_name || 'Usuario del Sistema'
            }));

            if (isLoadMore) {
                setLogs(prev => [...prev, ...mappedData]);
                setPage(currentPage);
            } else {
                setLogs(mappedData);
                setPage(0);
            }
            
            setHasMore(data?.length === PAGE_SIZE);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [clinic, page, startDate, endDate, logType, professionalId, debouncedSearchTerm, teamMembers]);

    // Reset and fetch when filters change
    useEffect(() => {
        fetchLogs(false);
    }, [startDate, endDate, logType, professionalId, debouncedSearchTerm]); 

    const handleLoadMore = () => {
        fetchLogs(true);
    };

    const handleExport = async () => {
        if (!clinic) return;
        setIsExporting(true);
        try {
            // Fetch ALL matching records without pagination for export
            const query = buildQuery();
            const { data, error } = await query;
            
            if (error) throw error;
            if (!data || data.length === 0) {
                alert("No hay datos para exportar con los filtros actuales.");
                return;
            }

            // Generate CSV
            const headers = ['ID Registro', 'Fecha', 'Hora', 'Tipo de Actividad', 'Descripción', 'Paciente', 'Profesional Responsable'];
            const csvRows = [headers.join(',')];

            data.forEach((item: any) => {
                const date = new Date(item.created_at);
                const professionalName = teamMembers.find(t => t.user_id === item.created_by_user_id)?.full_name || 'Usuario del Sistema';
                
                // Escape quotes for CSV
                const description = item.description ? `"${item.description.replace(/"/g, '""')}"` : '""';
                
                const row = [
                    item.id,
                    date.toLocaleDateString('es-MX'),
                    date.toLocaleTimeString('es-MX'),
                    item.log_type,
                    description,
                    item.persons?.full_name || 'Desconocido',
                    professionalName
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `auditoria_clinica_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err: any) {
            console.error("Export error:", err);
            setError("Error al exportar los datos.");
        } finally {
            setIsExporting(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        ...styles.input,
        marginBottom: 0,
        height: '42px',
        fontSize: '0.9rem',
        padding: '0.5rem 0.75rem'
    };
    
    const getTypeColor = (type: string) => {
        if (type.includes('IA')) return 'var(--primary-color)';
        if (type === 'AUDITORÍA') return 'var(--text-light)';
        if (type === 'Nota de Consulta') return '#10B981';
        return 'var(--text-color)';
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{...styles.pageHeader, alignItems: 'flex-start'}}>
                <div>
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Auditoría de Actividad</h1>
                    <p style={{ margin: 0, color: 'var(--text-light)' }}>
                        Registro histórico de todas las acciones realizadas en la clínica (NOM-004).
                    </p>
                </div>
                <button 
                    onClick={handleExport} 
                    disabled={isExporting || loading}
                    className="button-secondary"
                    style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                >
                    {isExporting ? 'Exportando...' : <>{ICONS.download} Exportar CSV</>}
                </button>
            </div>

            {/* Filters Bar */}
            <div style={{
                backgroundColor: 'var(--surface-color)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                alignItems: 'end'
            }}>
                <div>
                    <label style={styles.label}>Buscar Paciente</label>
                    <input 
                        type="text" 
                        placeholder="Nombre..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={inputStyle} 
                    />
                </div>
                <div>
                    <label style={styles.label}>Tipo de Actividad</label>
                    <div className="select-wrapper">
                        <select value={logType} onChange={e => setLogType(e.target.value)} style={inputStyle}>
                            <option value="all">Todas</option>
                            {logTypes.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label style={styles.label}>Profesional</label>
                    <div className="select-wrapper">
                        <select value={professionalId} onChange={e => setProfessionalId(e.target.value)} style={inputStyle}>
                            <option value="all">Todos</option>
                            {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    <div style={{flex: 1}}>
                        <label style={styles.label}>Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{flex: 1}}>
                        <label style={styles.label}>Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {loading ? <SkeletonLoader type="list" count={8} /> : 
                error ? <p style={styles.error}>{error}</p> : 
                logs.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                        <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.clipboard}</div>
                        <p>No se encontraron registros con los filtros seleccionados.</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} style={{
                            backgroundColor: 'var(--surface-color)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: '1rem',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                            transition: 'transform 0.1s',
                        }} className="card-hover">
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: 'var(--surface-hover-color)',
                                color: getTypeColor(log.log_type),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, fontSize: '1.2rem'
                            }}>
                                {log.log_type.includes('IA') ? ICONS.sparkles : log.log_type === 'AUDITORÍA' ? ICONS.lock : ICONS.file}
                            </div>
                            
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem'}}>
                                    <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)'}}>{log.log_type}</h4>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)', whiteSpace: 'nowrap'}}>
                                        {new Date(log.created_at).toLocaleString('es-MX')}
                                    </span>
                                </div>
                                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-color)', lineHeight: 1.5}}>
                                    {log.description}
                                </p>
                            </div>

                            <div style={{
                                display: 'flex', 
                                flexDirection: isMobile ? 'row' : 'column',
                                alignItems: isMobile ? 'center' : 'flex-end',
                                gap: isMobile ? '1rem' : '0.25rem',
                                borderLeft: isMobile ? 'none' : '1px solid var(--border-color)',
                                borderTop: isMobile ? '1px solid var(--border-color)' : 'none',
                                paddingLeft: isMobile ? 0 : '1rem',
                                paddingTop: isMobile ? '1rem' : 0,
                                marginTop: isMobile ? '0.5rem' : 0,
                                width: isMobile ? '100%' : '200px',
                                textAlign: isMobile ? 'left' : 'right',
                                fontSize: '0.8rem'
                            }}>
                                <div>
                                    <span style={{color: 'var(--text-light)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase'}}>Paciente</span>
                                    <span style={{fontWeight: 600, color: 'var(--primary-color)'}}>{log.person_name}</span>
                                </div>
                                <div>
                                    <span style={{color: 'var(--text-light)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase'}}>Realizado por</span>
                                    <span style={{fontWeight: 500}}>{log.professional_name}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {hasMore && !loading && (
                    <button 
                        onClick={handleLoadMore} 
                        disabled={loadingMore} 
                        className="button-secondary"
                        style={{marginTop: '2rem', width: '100%', padding: '1rem'}}
                    >
                        {loadingMore ? 'Cargando más...' : 'Cargar más registros'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuditPage;
