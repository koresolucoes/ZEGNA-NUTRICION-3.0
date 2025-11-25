
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Bitácora de Seguimiento</h3>
                <button onClick={onAdd} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.add} Agregar Nota</button>
            </div>

            <div style={{...styles.filterBar, marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px'}}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input type="text" placeholder="Buscar en bitácora..." value={filters.searchTerm} onChange={e => setFilters(prev => ({...prev, searchTerm: e.target.value}))} style={{...styles.searchInput, height: '38px'}}/>
                </div>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    <input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))} style={{margin:0, fontSize: '0.85rem', padding: '0.5rem'}} />
                    <span style={{color: 'var(--text-light)'}}>-</span>
                    <input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))} style={{margin:0, fontSize: '0.85rem', padding: '0.5rem'}} />
                </div>
            </div>

            {filteredLogs.length > 0 ? (
                 <div style={{
                     display: 'flex', 
                     flexDirection: 'column', 
                     gap: '1rem',
                     maxHeight: '600px',
                     overflowY: 'auto',
                     paddingRight: '0.5rem',
                     // Custom scrollbar styling for cleaner look
                     scrollbarWidth: 'thin',
                     scrollbarColor: 'var(--text-light) transparent'
                 }}>
                    {filteredLogs.map(log => {
                        const creator = log.created_by_user_id ? memberMap.get(log.created_by_user_id) : null;
                        return (
                            <div key={log.id} className="card-hover" onClick={() => onView(log)} style={{
                                backgroundColor: 'var(--surface-color)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                padding: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', padding: '0.5rem', minWidth: '60px', textAlign: 'center'
                                }}>
                                    <span style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-light)'}}>
                                        {new Date(log.log_time || log.created_at).toLocaleString('es-MX', {month: 'short'}).toUpperCase()}
                                    </span>
                                    <span style={{fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>
                                        {new Date(log.log_time || log.created_at).getDate()}
                                    </span>
                                </div>
                                
                                <div style={{flex: 1}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                        <h4 style={{margin: 0, color: 'var(--primary-color)', fontSize: '1rem'}}>{log.log_type}</h4>
                                        <div className="card-actions">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(log.id); }} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                            <button onClick={(e) => { e.stopPropagation(); openModal('deleteLog', log.id, '¿Eliminar esta bitácora?'); }} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', lineHeight: 1.5 }}>{log.description.substring(0, 150)}{log.description.length > 150 ? '...' : ''}</p>
                                    
                                    {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '16px', height: '16px', borderRadius: '50%'}} />
                                            <span>{creator.full_name || 'Usuario'} • {new Date(log.log_time || log.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                    <p>No hay registros en la bitácora.</p>
                </div>
            )}
        </section>
    );
};
