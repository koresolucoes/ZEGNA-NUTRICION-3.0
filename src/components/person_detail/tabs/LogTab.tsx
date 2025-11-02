import React, { FC, useState, useMemo } from 'react';
import { Log, TeamMember } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';

interface LogTabProps {
    logs: Log[];
    memberMap: Map<string, TeamMember>;
    onAdd: () => void;
    onEdit: (logId: string) => void;
    onView: (log: Log) => void;
    openModal: (action: 'deleteLog', id: string, text: string) => void;
}

export const LogTab: FC<LogTabProps> = ({ logs, memberMap, onAdd, onEdit, onView, openModal }) => {
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '' });

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const searchTermLower = filters.searchTerm.toLowerCase();
            const matchesSearch = log.log_type.toLowerCase().includes(searchTermLower) || log.description.toLowerCase().includes(searchTermLower);
            const logDate = new Date(log.log_time || log.created_at);
            const start = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
            let matchesDate = true;
            if (start && logDate < start) matchesDate = false;
            if (end && logDate > end) matchesDate = false;
            return matchesSearch && matchesDate;
        });
    }, [logs, filters]);

    return (
        <section className="fade-in">
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Bitácora</h2>
                <button onClick={onAdd}>{ICONS.add} Agregar</button>
            </div>
            <div style={styles.filterBar}>
                <div style={styles.searchInputContainer}><span style={styles.searchInputIcon}>🔍</span><input type="text" placeholder="Buscar en bitácora..." value={filters.searchTerm} onChange={e => setFilters(prev => ({...prev, searchTerm: e.target.value}))} style={styles.searchInput}/></div>
                <div style={{flex: 1}}><label>Desde</label><input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))} style={{margin:0, minWidth: '140px'}} /></div>
                <div style={{flex: 1}}><label>Hasta</label><input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))} style={{margin:0, minWidth: '140px'}} /></div>
            </div>
            {filteredLogs.length > 0 ? (
                 <div className="info-grid">
                    {filteredLogs.map(log => {
                        const creator = log.created_by_user_id ? memberMap.get(log.created_by_user_id) : null;
                        return (
                            <div key={log.id} className="info-card info-card-clickable" onClick={() => onView(log)}>
                                <div style={{flex: 1}}>
                                    <p style={{margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--primary-color)'}}>{log.log_type}</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5em' }}>{log.description}</p>
                                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(log.log_time || log.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>{creator.full_name || 'Usuario'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(log.id); }} style={styles.iconButton} title="Editar Bitácora">{ICONS.edit}</button>
                                    <button onClick={(e) => { e.stopPropagation(); openModal('deleteLog', log.id, '¿Eliminar esta bitácora?'); }} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar Bitácora">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : <p>No hay registros en la bitácora para el filtro seleccionado.</p>}
        </section>
    );
};