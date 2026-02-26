
import React, { FC, FormEvent } from 'react';
import { Person, AppointmentWithPerson, Allergy, Medication, MedicalHistory } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface LatestMetrics {
    hasAnyData: boolean;
    latestWeight?: number | null;
    latestHeight?: number | null;
    latestGlucose?: number | null;
    latestCholesterol?: number | null;
    latestTriglycerides?: number | null;
    latestHba1c?: number | null;
}

interface SummaryPanelProps {
    person: Person;
    latestMetrics: LatestMetrics;
    allergies?: Allergy[];
    medications?: Medication[];
    medicalHistory?: MedicalHistory[];
    relevantAppointment: AppointmentWithPerson | null;
    updateAppointmentStatus: (id: string, status: 'completed' | 'no-show' | 'cancelled') => Promise<void>;
    appointmentUpdateLoading: boolean;
    quickConsult: { weight_kg: string; height_cm: string };
    setQuickConsult: React.Dispatch<React.SetStateAction<{ weight_kg: string; height_cm: string; }>>;
    handleQuickConsultSubmit: (e: FormEvent) => Promise<void>;
    formLoading: 'consult' | 'log' | null;
    quickLog: string;
    setQuickLog: React.Dispatch<React.SetStateAction<string>>;
    handleQuickLogSubmit: (e: FormEvent) => Promise<void>;
    sendContextToAi: (context: { displayText: string; fullText: string; }) => void;
    formatSummaryForAI: () => { displayText: string; fullText: string; };
    calculateAge: (birthDate: string | null | undefined) => string;
    quickSuccess?: string | null;
}

const SyncItem: FC<{ label: string, action?: 'AGREGAR' | 'EDITAR', subItems?: string[] }> = ({ label, action, subItems }) => (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)', textTransform: 'uppercase' }}>{label}</span>
            {action && (
                <button style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--primary-color)', 
                    fontWeight: 600, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem'
                }}>
                    {action}
                </button>
            )}
        </div>
        {subItems && subItems.length > 0 && (
            <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subItems.map(item => (
                    <span key={item} style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>- {item}</span>
                ))}
            </div>
        )}
    </div>
);

const SummaryPanel: FC<SummaryPanelProps> = ({
    person, latestMetrics, allergies, medications, medicalHistory, sendContextToAi, formatSummaryForAI
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <button 
                    onClick={() => sendContextToAi(formatSummaryForAI())}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--surface-hover-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontWeight: 600,
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        fontSize: '0.9rem'
                    }}
                    className="card-hover"
                >
                    <span style={{ color: 'var(--primary-color)' }}>{ICONS.send}</span> SINCRONIZAR CON ASISTENTE
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
                <SyncItem label="Embarazo" action="AGREGAR" />
                <SyncItem label="Medicamentos" action="AGREGAR" />
                <SyncItem label="Alergias" action="AGREGAR" />
                <SyncItem label="Padecimiento" action="AGREGAR" />
                <SyncItem label="Discapacidad" action="AGREGAR" />
                <SyncItem 
                    label="Informacion adicional" 
                    action="EDITAR" 
                    subItems={['Estatura', 'Peso', 'Sexo', 'Grupo Sanguineo']} 
                />
                <SyncItem label="Notas" />
                <SyncItem label="Fecha de nacimiento" action="EDITAR" />
                <SyncItem label="Medicamentos que afectan la frecuencia cardiaca" />
                <SyncItem 
                    label="Objetivo" 
                    action="EDITAR" 
                    subItems={['Perdida de peso', 'Aumento de masa muscular', 'Control de indice glucemico', 'Otros / especificar']} 
                />
            </div>
        </div>
    );
};

export default SummaryPanel;

