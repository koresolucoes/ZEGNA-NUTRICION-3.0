import React, { FC, useState, ReactNode } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, ConsultationWithLabs, Plan, DietPlanHistoryItem } from '../../types';
import CardButton from './CardButton';

interface PatientRecordsPanelProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    dietPlan?: DietPlanHistoryItem | null;
    exercisePlan?: any | null; // Define proper type if available
    onViewPlan: () => void;
    onViewExercise: () => void;
    onViewConsultation: (consultation: ConsultationWithLabs) => void;
    onAudit: () => void;
}

const PatientRecordsPanel: FC<PatientRecordsPanelProps> = ({
    person, consultations, dietPlan, exercisePlan,
    onViewPlan, onViewExercise, onViewConsultation, onAudit
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = consultations.filter(c => 
        c.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.consultation_date.includes(searchTerm)
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-active)', borderRight: '1px solid var(--border-color)' }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {ICONS.folder}
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>DATOS EN EXPEDIENTE</h3>
                </div>
            </div>

            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                
                {/* Grid of Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <CardButton 
                        icon={ICONS.book} 
                        label="Plan de Alimentación" 
                        subLabel={dietPlan ? 'Ver actual' : 'Sin asignar'}
                        onClick={onViewPlan} 
                    />
                    <CardButton 
                        icon={ICONS.exercise} 
                        label="Rutina de Ejercicio" 
                        subLabel={exercisePlan ? 'Ver actual' : 'Sin asignar'}
                        onClick={onViewExercise} 
                    />
                    <CardButton 
                        icon={ICONS.clinic} 
                        label="Consulta de Seguimiento" 
                        subLabel="Nueva consulta"
                        onClick={() => onViewConsultation({} as any)} // Trigger new consultation
                    />
                    <CardButton 
                        icon={ICONS.clipboard} 
                        label="Auditoría" 
                        subLabel="Revisar expediente"
                        onClick={onAudit} 
                    />
                </div>

                {/* Patient Info */}
                <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>PACIENTE SELECCIONADO</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', fontWeight: 700 }}>
                            {person.full_name.charAt(0)}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{person.full_name}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>{person.email || 'Sin email'}</p>
                        </div>
                    </div>
                </div>

                {/* Search History */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        {ICONS.search}
                        <input 
                            type="text" 
                            placeholder="Buscar en el historial" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                flex: 1, 
                                border: 'none', 
                                background: 'transparent', 
                                borderBottom: '1px solid var(--border-color)', 
                                padding: '0.5rem 0',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredHistory.slice(0, 5).map((consultation, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => onViewConsultation(consultation)}
                                className="card-hover"
                                style={{ 
                                    padding: '0.75rem', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'var(--surface-color)', 
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Consulta</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{new Date(consultation.consultation_date).toLocaleDateString()}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {consultation.notes || 'Sin notas'}
                                </p>
                            </div>
                        ))}
                         {filteredHistory.length === 0 && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No se encontraron resultados</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PatientRecordsPanel;
