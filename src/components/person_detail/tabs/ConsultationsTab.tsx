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
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Historial de Consultas</h2>
                <button onClick={onAdd}>{ICONS.add} Nueva</button>
            </div>
             <div style={{...styles.filterBar, marginBottom: '1.5rem'}}>
                <div style={{flex: 1}}><label>Desde</label><input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))} style={{margin:0}} /></div>
                <div style={{flex: 1}}><label>Hasta</label><input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))} style={{margin:0}} /></div>
            </div>
            {filteredConsultations.length > 0 ? (
                <div className="info-grid">
                    {filteredConsultations.map(c => {
                        const nutritionist = c.nutritionist_id ? memberMap.get(c.nutritionist_id) : null;
                        return (
                            <div key={c.id} className="info-card info-card-clickable" onClick={() => onView(c)}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                                        {new Date(c.consultation_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </h4>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Peso:</strong> {c.weight_kg ?? '-'} kg</p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>IMC:</strong> {c.imc ?? '-'}</p>
                                    {nutritionist && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <img src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>{nutritionist.full_name || 'Usuario'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(c.id); }} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={(e) => { e.stopPropagation(); openModal('deleteConsultation', c.id, '¿Eliminar esta consulta?'); }} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : <p>No hay consultas registradas para el filtro seleccionado.</p>}
        </section>
    );
};