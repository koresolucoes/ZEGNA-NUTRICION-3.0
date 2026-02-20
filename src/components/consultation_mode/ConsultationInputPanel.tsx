import React, { FC, useState, ReactNode } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, MedicalHistory, Allergy, Medication } from '../../types';
import ListItem from './ListItem';

interface ConsultationInputPanelProps {
    person: Person;
    medicalHistory: MedicalHistory[];
    allergies: Allergy[];
    medications: Medication[];
    onSync: () => void;
    onUpdatePerson: (updates: Partial<Person>) => Promise<void>;
    onAddAllergy: () => void;
    onAddMedication: () => void;
    onAddCondition: () => void;
    onUpdateMedicalHistory: (updates: Partial<MedicalHistory>) => Promise<void>;
}

const ConsultationInputPanel: FC<ConsultationInputPanelProps> = ({
    person, medicalHistory, allergies, medications,
    onSync, onUpdatePerson, onAddAllergy, onAddMedication, onAddCondition, onUpdateMedicalHistory
}) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        await onSync();
        setTimeout(() => setIsSyncing(false), 1000);
    };

    // Derived Data
    const history = medicalHistory[0] || {};
    const hasPregnancy = history.condition_pregnancy;
    const hasDisability = history.condition_disability;
    
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background-color)', borderRight: '1px solid var(--border-color)' }}>
            {/* Header Action */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--surface-color)',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    className="button-hover-effect"
                >
                    {ICONS.send} {isSyncing ? 'Sincronizando...' : 'SINCRONIZAR CON ASISTENTE'}
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
                
                <ListItem 
                    label="Embarazo" 
                    value={hasPregnancy ? "Sí" : null} 
                    actionLabel={hasPregnancy ? "EDITAR" : "AGREGAR"} 
                    onAction={() => onUpdateMedicalHistory({ condition_pregnancy: !hasPregnancy })} 
                />

                <ListItem 
                    label="Medicamentos" 
                    value={medications.length > 0 ? medications.map(m => m.name).join(', ') : null} 
                    actionLabel="AGREGAR" 
                    onAction={onAddMedication} 
                />

                <ListItem 
                    label="Alergias" 
                    value={allergies.length > 0 ? allergies.map(a => a.substance).join(', ') : null} 
                    actionLabel="AGREGAR" 
                    onAction={onAddAllergy} 
                />

                <ListItem 
                    label="Padecimiento" 
                    value={history.family_history || null} 
                    actionLabel="AGREGAR" 
                    onAction={onAddCondition} 
                />

                <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Información Adicional</p>
                        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>EDITAR</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Estatura</span>
                            <p style={{ margin: 0, fontWeight: 500 }}>{history.height_cm ? `${history.height_cm} cm` : '-'}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Peso</span>
                            <p style={{ margin: 0, fontWeight: 500 }}>{history.weight_kg ? `${history.weight_kg} kg` : '-'}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Grupo Sanguíneo</span>
                            <p style={{ margin: 0, fontWeight: 500 }}>{person.blood_type || '-'}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Sexo</span>
                            <p style={{ margin: 0, fontWeight: 500 }}>{person.gender === 'male' ? 'Masculino' : person.gender === 'female' ? 'Femenino' : '-'}</p>
                        </div>
                    </div>
                </div>

                <ListItem 
                    label="Notas" 
                    value={person.notes} 
                    actionLabel="EDITAR" 
                    onAction={() => {}} 
                />

                <ListItem 
                    label="Fecha de Nacimiento" 
                    value={person.birth_date} 
                    actionLabel="EDITAR" 
                    onAction={() => {}} 
                />

                <ListItem 
                    label="Silla de ruedas o discapacidad" 
                    value={hasDisability ? "Sí" : null} 
                    actionLabel={hasDisability ? "EDITAR" : "AGREGAR"} 
                    onAction={() => onUpdateMedicalHistory({ condition_disability: !hasDisability })} 
                />

                <div style={{ padding: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Objetivos</p>
                        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>EDITAR</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {person.health_goal ? (
                            <div style={{ fontSize: '0.9rem' }}>{person.health_goal}</div>
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Sin objetivos definidos</div>
                        )}
                    </div>
                </div>

                {/* Sparklines Placeholder */}
                <div style={{ marginTop: 'auto', padding: '1rem 0', opacity: 0.5 }}>
                    <svg viewBox="0 0 100 20" style={{ width: '100%', height: '40px' }}>
                        <path d="M0 10 Q 25 5, 50 10 T 100 10" fill="none" stroke="var(--text-light)" strokeWidth="2" />
                    </svg>
                     <svg viewBox="0 0 100 20" style={{ width: '100%', height: '40px' }}>
                        <path d="M0 15 Q 25 10, 50 15 T 100 5" fill="none" stroke="var(--text-light)" strokeWidth="2" />
                    </svg>
                </div>

            </div>
        </div>
    );
};

export default ConsultationInputPanel;
