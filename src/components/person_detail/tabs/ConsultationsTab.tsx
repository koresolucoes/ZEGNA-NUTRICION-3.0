
import React, { FC, useState, useMemo } from 'react';
import { ConsultationWithLabs, TeamMember } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';

interface ConsultationsTabProps {
    consultations: ConsultationWithLabs[];
    memberMap: Map<string, TeamMember>;
    onAdd: () => void;
    onEdit: (consultationId: string) => void;
    onView: (consultation: ConsultationWithLabs) => void;
    openModal: (action: 'deleteConsultation', id: string, text: string) => void;
}

export const ConsultationsTab: FC<ConsultationsTabProps> = ({ consultations, memberMap, onAdd, onEdit, onView, openModal }) => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    const filteredConsultations = useMemo(() => {
        return consultations.filter(c => {
            if (!filters.startDate && !filters.endDate) return true;
            const consultDate = new Date(c.consultation_date);
            const start = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
            if (start && consultDate < start) return false;
            if (end && consultDate > end) return false;
            return true;
        });
    }, [consultations, filters]);

    return (
        <section className="fade-in">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Historial de Consultas</h3>
                <button onClick={onAdd} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.add} Nueva Consulta</button>
            </div>

             <div style={{...styles.filterBar, marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
                    <span style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)'}}>Filtrar:</span>
                    <input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))} style={{margin:0, minWidth: '130px', fontSize: '0.85rem', padding: '0.4rem'}} />
                    <span style={{color: 'var(--text-light)'}}>-</span>
                    <input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))} style={{margin:0, minWidth: '130px', fontSize: '0.85rem', padding: '0.4rem'}} />
                </div>
            </div>

            {filteredConsultations.length > 0 ? (
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredConsultations.map(c => {
                        return (
                            <div key={c.id} onClick={() => onView(c)} style={{ 
                                backgroundColor: 'var(--surface-hover-color)', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border-color)',
                                padding: '1.25rem',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }} className="card-hover">
                                {/* Top Actions */}
                                <div style={{position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.25rem'}}>
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(c.id); }} style={{...styles.iconButton, width: '28px', height: '28px', padding: '4px'}} title="Editar">{ICONS.edit}</button>
                                    <button onClick={(e) => { e.stopPropagation(); openModal('deleteConsultation', c.id, '¿Eliminar esta consulta?'); }} style={{...styles.iconButton, color: 'var(--error-color)', width: '28px', height: '28px', padding: '4px'}} title="Eliminar">{ICONS.delete}</button>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.1rem', fontWeight: 700 }}>
                                        {new Date(c.consultation_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                    </h4>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>
                                        {new Date(c.consultation_date).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'})}
                                    </span>
                                </div>

                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                    <div style={{backgroundColor: 'var(--surface-color)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)'}}>
                                        <span style={{fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase'}}>Peso</span>
                                        <span style={{fontWeight: 700, fontSize: '1rem', color: 'var(--text-color)'}}>{c.weight_kg ?? '-'}</span>
                                    </div>
                                    <div style={{backgroundColor: 'var(--surface-color)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)'}}>
                                        <span style={{fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase'}}>IMC</span>
                                        <span style={{fontWeight: 700, fontSize: '1rem', color: 'var(--text-color)'}}>{c.imc ?? '-'}</span>
                                    </div>
                                     <div style={{backgroundColor: 'var(--surface-color)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)'}}>
                                        <span style={{fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase'}}>TA</span>
                                        <span style={{fontWeight: 700, fontSize: '1rem', color: 'var(--text-color)'}}>{c.ta ?? '-'}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-light)'}}>
                    <p>No hay consultas registradas para el filtro seleccionado.</p>
                </div>
            )}
        </section>
    );
};
