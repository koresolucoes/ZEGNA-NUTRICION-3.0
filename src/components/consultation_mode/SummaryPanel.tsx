import React, { FC, useState, useRef } from 'react';
import { Person, Allergy, Medication, MedicalHistory } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface SummaryPanelProps {
    person?: Person;
    latestMetrics?: any;
    allergies: Allergy[];
    medications: Medication[];
    medicalHistory: MedicalHistory[];
    sendContextToAi: (context: { displayText: string; fullText: string; }) => void;
    formatSummaryForAI: () => { displayText: string; fullText: string; };
    onSaveData: (type: string, data: any, sourceRect?: DOMRect) => Promise<void>;
}

const SyncItem: FC<{ 
    label: string, 
    action?: 'AGREGAR' | 'EDITAR', 
    subItems?: string[], 
    onActionClick?: (e: React.MouseEvent) => void,
    values?: string[] 
}> = ({ label, action, subItems, onActionClick, values }) => (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)', textTransform: 'uppercase' }}>{label}</span>
            {action && (
                <button 
                    onClick={onActionClick}
                    style={{ 
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
        {subItems && (
            <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {subItems.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        <span style={{ fontWeight: 600 }}>{item}:</span> {values && values[idx] ? values[idx] : '-'}
                    </div>
                ))}
            </div>
        )}
        {!subItems && values && values.length > 0 && (
             <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-color)' }}>
                {values.map((v, i) => <div key={i}>• {v}</div>)}
             </div>
        )}
    </div>
);

const SummaryPanel: FC<SummaryPanelProps> = ({
    person, latestMetrics, allergies, medications, medicalHistory, sendContextToAi, formatSummaryForAI, onSaveData
}) => {
    const [editModal, setEditModal] = useState<{isOpen: boolean, type: string, label: string, action: string, fields: any[]}>({
        isOpen: false, type: '', label: '', action: '', fields: []
    });
    const [formData, setFormData] = useState<any>({});
    const buttonRef = useRef<DOMRect | undefined>(undefined);

    const handleActionClick = (e: React.MouseEvent, type: string, label: string, action: string) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        buttonRef.current = rect;

        let fields: any[] = [];
        let initialData: any = {};

        switch(type) {
            case 'allergy':
                fields = [{ name: 'substance', label: 'Sustancia', type: 'text' }, { name: 'severity', label: 'Severidad', type: 'select', options: ['Leve', 'Moderada', 'Severa'] }];
                break;
            case 'medication':
                fields = [{ name: 'name', label: 'Nombre', type: 'text' }, { name: 'dosage', label: 'Dosis', type: 'text' }, { name: 'frequency', label: 'Frecuencia', type: 'text' }];
                break;
            case 'condition': // Padecimiento, Discapacidad, Embarazo
                fields = [{ name: 'condition', label: 'Condición', type: 'text', defaultValue: label === 'Embarazo' ? 'Embarazo' : '' }, { name: 'notes', label: 'Notas', type: 'textarea' }];
                if (label === 'Embarazo') initialData.condition = 'Embarazo';
                break;
            case 'metrics': // Info adicional
                fields = [
                    { name: 'height_cm', label: 'Estatura (cm)', type: 'number', defaultValue: latestMetrics?.height_cm },
                    { name: 'weight_kg', label: 'Peso (kg)', type: 'number', defaultValue: latestMetrics?.weight_kg },
                    { name: 'gender', label: 'Sexo', type: 'select', options: ['Masculino', 'Femenino', 'Otro'], defaultValue: person?.gender },
                    { name: 'blood_type', label: 'Grupo Sanguíneo', type: 'text', defaultValue: '' } // TODO: Extract from notes if possible
                ];
                initialData = { height_cm: latestMetrics?.height_cm, weight_kg: latestMetrics?.weight_kg, gender: person?.gender };
                break;
            case 'notes':
                fields = [{ name: 'notes', label: 'Notas', type: 'textarea', defaultValue: person?.notes }];
                initialData = { notes: person?.notes };
                break;
            case 'birth_date':
                fields = [{ name: 'birth_date', label: 'Fecha de Nacimiento', type: 'date', defaultValue: person?.birth_date }];
                initialData = { birth_date: person?.birth_date };
                break;
            case 'goal':
                fields = [{ name: 'health_goal', label: 'Objetivo', type: 'textarea', defaultValue: person?.health_goal }];
                initialData = { health_goal: person?.health_goal };
                break;
        }

        setFormData(initialData);
        setEditModal({ isOpen: true, type, label, action, fields });
    };

    const handleSave = async () => {
        await onSaveData(editModal.type, formData, buttonRef.current);
        setEditModal({ ...editModal, isOpen: false });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {editModal.isOpen && (
                <div style={{...styles.modalOverlay, zIndex: 3000}}>
                    <div style={{...styles.modalContent, maxWidth: '400px'}}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{editModal.action} {editModal.label}</h3>
                            <button onClick={() => setEditModal({...editModal, isOpen: false})} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                        </div>
                        <div style={styles.modalBody}>
                            {editModal.fields.map((field, idx) => (
                                <div key={idx} style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{field.label}</label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            rows={3}
                                            value={formData[field.name] || ''}
                                            onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            value={formData[field.name] || ''}
                                            onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={formData[field.name] || ''}
                                            onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}
                                        />
                                    )}
                                </div>
                            ))}
                            <button 
                                onClick={handleSave} 
                                style={{width: '100%', padding: '0.75rem', marginTop: '1rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'}}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <button 
                    onClick={() => sendContextToAi(formatSummaryForAI())}
                    style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        backgroundColor: 'var(--primary-color)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        textTransform: 'uppercase',
                        fontSize: '0.9rem'
                    }}
                >
                    <span>{ICONS.sparkles}</span>
                    Sincronizar con asistente
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
                <SyncItem 
                    label="Embarazo" 
                    action="AGREGAR" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Embarazo', 'AGREGAR')} 
                    values={medicalHistory.filter(h => h.condition === 'Embarazo').map(h => h.condition)}
                />
                <SyncItem 
                    label="Medicamentos" 
                    action="AGREGAR" 
                    onActionClick={(e) => handleActionClick(e, 'medication', 'Medicamentos', 'AGREGAR')} 
                    values={medications.map(m => `${m.name} (${m.dosage || ''})`)}
                />
                <SyncItem 
                    label="Alergias" 
                    action="AGREGAR" 
                    onActionClick={(e) => handleActionClick(e, 'allergy', 'Alergias', 'AGREGAR')} 
                    values={allergies.map(a => `${a.substance} (${a.severity || ''})`)}
                />
                <SyncItem 
                    label="Padecimiento" 
                    action="AGREGAR" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Padecimiento', 'AGREGAR')} 
                    values={medicalHistory.filter(h => h.condition !== 'Embarazo').map(h => h.condition)}
                />
                <SyncItem 
                    label="Discapacidad" 
                    action="AGREGAR" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Discapacidad', 'AGREGAR')} 
                />
                <SyncItem 
                    label="Informacion adicional" 
                    action="EDITAR" 
                    subItems={['Estatura', 'Peso', 'Sexo', 'Grupo Sanguineo']} 
                    values={[
                        latestMetrics?.height_cm ? `${latestMetrics.height_cm} cm` : '-',
                        latestMetrics?.weight_kg ? `${latestMetrics.weight_kg} kg` : '-',
                        person?.gender || '-',
                        '-' // TODO: Blood type
                    ]}
                    onActionClick={(e) => handleActionClick(e, 'metrics', 'Informacion adicional', 'EDITAR')}
                />
                <SyncItem 
                    label="Notas" 
                    action="EDITAR"
                    onActionClick={(e) => handleActionClick(e, 'notes', 'Notas', 'EDITAR')}
                    values={person?.notes ? [person.notes] : []}
                />
                <SyncItem 
                    label="Fecha de nacimiento" 
                    action="EDITAR" 
                    onActionClick={(e) => handleActionClick(e, 'birth_date', 'Fecha de nacimiento', 'EDITAR')} 
                    values={person?.birth_date ? [person.birth_date] : []}
                />
                <SyncItem label="Medicamentos que afectan la frecuencia cardiaca" />
                <SyncItem 
                    label="Objetivo" 
                    action="EDITAR" 
                    subItems={['Perdida de peso', 'Aumento de masa muscular', 'Control de indice glucemico', 'Otros / especificar']} 
                    onActionClick={(e) => handleActionClick(e, 'goal', 'Objetivo', 'EDITAR')}
                    values={person?.health_goal ? [person.health_goal] : []}
                />
            </div>
        </div>
    );
};

export default SummaryPanel;
