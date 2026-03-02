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

const IosSwitch: FC<{ checked?: boolean, onChange?: () => void }> = ({ checked, onChange }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange?.(); }}
        style={{
            width: '36px',
            height: '20px',
            backgroundColor: checked ? 'var(--primary-color)' : '#E5E7EB',
            borderRadius: '10px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
            flexShrink: 0
        }}
    >
        <div 
            style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: checked ? '18px' : '2px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
        />
    </div>
);

const SyncItem: FC<{ 
    label: string, 
    action?: 'Agregar' | 'Editar', 
    subItems?: string[], 
    onActionClick?: (e: React.MouseEvent) => void,
    values?: string[],
    isSelected?: boolean,
    onSelect?: () => void
}> = ({ label, action, subItems, onActionClick, values, isSelected, onSelect }) => (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent', transition: 'background-color 0.2s', cursor: onSelect ? 'pointer' : 'default', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }} onClick={onSelect}>
        {onSelect && (
            <div style={{ paddingTop: '0.1rem' }}>
                <IosSwitch checked={isSelected} onChange={onSelect} />
            </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)', textTransform: 'uppercase' }}>{label}</span>
                {action && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onActionClick?.(e); }}
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--primary-color)', 
                            fontWeight: 600, 
                            fontSize: '0.8rem', 
                            cursor: 'pointer',
                            padding: '0.25rem 0.5rem',
                            flexShrink: 0
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
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const toggleSelection = (label: string) => {
        setSelectedItems(prev => 
            prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
        );
    };

    const handleSyncWithAi = () => {
        if (selectedItems.length === 0) {
            // If nothing selected, send the whole summary
            sendContextToAi(formatSummaryForAI());
        } else {
            // Build custom context based on selection
            let customFullText = `Paciente: ${person?.full_name}\n\n`;
            let customDisplayText = `Contexto seleccionado de ${person?.full_name}`;

            if (selectedItems.includes('Embarazo')) {
                const vals = medicalHistory.filter(h => h.condition === 'Embarazo').map(h => h.condition);
                if (vals.length > 0) customFullText += `Embarazo:\n${vals.map(v => `• ${v}`).join('\n')}\n\n`;
            }
            if (selectedItems.includes('Medicamentos')) {
                const vals = medications.filter(m => !m.notes?.toLowerCase().includes('frecuencia cardiaca')).map(m => `${m.name} (${m.dosage || ''})`);
                if (vals.length > 0) customFullText += `Medicamentos:\n${vals.map(v => `• ${v}`).join('\n')}\n\n`;
            }
            if (selectedItems.includes('Alergias')) {
                const vals = allergies.map(a => `${a.substance} (${a.severity || ''})`);
                if (vals.length > 0) customFullText += `Alergias:\n${vals.map(v => `• ${v}`).join('\n')}\n\n`;
            }
            if (selectedItems.includes('Padecimiento')) {
                const vals = medicalHistory.filter(h => h.condition !== 'Embarazo').map(h => h.condition);
                if (vals.length > 0) customFullText += `Padecimientos:\n${vals.map(v => `• ${v}`).join('\n')}\n\n`;
            }
            // Discapacidad has no values array mapped in the original code, skipping for now or add if needed
            if (selectedItems.includes('Información Adicional')) {
                customFullText += `Información Adicional:\nEstatura: ${latestMetrics?.height_cm ? `${latestMetrics.height_cm} cm` : '-'}\nPeso: ${latestMetrics?.weight_kg ? `${latestMetrics.weight_kg} kg` : '-'}\nSexo: ${person?.gender || '-'}\n\n`;
            }
            if (selectedItems.includes('Notas')) {
                if (person?.notes) customFullText += `Notas:\n${person.notes}\n\n`;
            }
            if (selectedItems.includes('Fecha de Nacimiento')) {
                if (person?.birth_date) customFullText += `Fecha de Nacimiento: ${person.birth_date}\n\n`;
            }
            if (selectedItems.includes('Medicamentos que Afectan la Frecuencia Cardiaca')) {
                const vals = medications.filter(m => m.notes?.toLowerCase().includes('frecuencia cardiaca')).map(m => `${m.name} (${m.dosage || ''})`);
                if (vals.length > 0) customFullText += `Medicamentos que Afectan la Frecuencia Cardiaca:\n${vals.map(v => `• ${v}`).join('\n')}\n\n`;
            }
            if (selectedItems.includes('Objetivo')) {
                if (person?.health_goal) customFullText += `Objetivo de Salud:\n${person.health_goal}\n\n`;
            }

            sendContextToAi({ displayText: customDisplayText, fullText: customFullText });
            setSelectedItems([]); // Clear selection after sending
        }
    };

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
                fields = [{ name: 'name', label: 'Nombre', type: 'text' }, { name: 'dosage', label: 'Dosis', type: 'text' }, { name: 'frequency', label: 'Frecuencia', type: 'text' }, { name: 'notes', label: 'Notas', type: 'textarea' }];
                if (label === 'Medicamentos que afectan la frecuencia cardiaca') {
                    initialData.notes = 'Afecta la frecuencia cardiaca';
                }
                break;
            case 'condition': // Padecimiento, Discapacidad, Embarazo
                if (label === 'Embarazo' || label === 'Discapacidad' || label === 'Padecimiento') {
                    fields = [
                        { name: 'has_condition', label: `¿Tiene ${label.toLowerCase()}?`, type: 'select', options: ['Sí', 'No'] },
                        { name: 'condition', label: 'Especificar cuál', type: 'text' },
                        { name: 'notes', label: 'Notas', type: 'textarea' }
                    ];
                    initialData.has_condition = 'Sí';
                    initialData.label_type = label;
                    if (label === 'Embarazo') initialData.condition = 'Embarazo';
                } else {
                    fields = [{ name: 'condition', label: 'Condición', type: 'text' }, { name: 'notes', label: 'Notas', type: 'textarea' }];
                }
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-color)' }}>
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
                    onClick={handleSyncWithAi}
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
                    {selectedItems.length > 0 ? `Sincronizar (${selectedItems.length}) con asistente` : 'Sincronizar todo con asistente'}
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
                <SyncItem 
                    label="Embarazo" 
                    action="Agregar" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Embarazo', 'Agregar')} 
                    values={medicalHistory.filter(h => h.condition === 'Embarazo').map(h => h.condition)}
                    isSelected={selectedItems.includes('Embarazo')}
                    onSelect={() => toggleSelection('Embarazo')}
                />
                <SyncItem 
                    label="Medicamentos" 
                    action="Agregar" 
                    onActionClick={(e) => handleActionClick(e, 'medication', 'Medicamentos', 'Agregar')} 
                    values={medications.filter(m => !m.notes?.toLowerCase().includes('frecuencia cardiaca')).map(m => `${m.name} (${m.dosage || ''})`)}
                    isSelected={selectedItems.includes('Medicamentos')}
                    onSelect={() => toggleSelection('Medicamentos')}
                />
                <SyncItem 
                    label="Alergias" 
                    action="Agregar" 
                    onActionClick={(e) => handleActionClick(e, 'allergy', 'Alergias', 'Agregar')} 
                    values={allergies.map(a => `${a.substance} (${a.severity || ''})`)}
                    isSelected={selectedItems.includes('Alergias')}
                    onSelect={() => toggleSelection('Alergias')}
                />
                <SyncItem 
                    label="Padecimiento" 
                    action="Agregar" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Padecimiento', 'Agregar')} 
                    values={medicalHistory.filter(h => h.condition !== 'Embarazo').map(h => h.condition)}
                    isSelected={selectedItems.includes('Padecimiento')}
                    onSelect={() => toggleSelection('Padecimiento')}
                />
                <SyncItem 
                    label="Discapacidad" 
                    action="Agregar" 
                    onActionClick={(e) => handleActionClick(e, 'condition', 'Discapacidad', 'Agregar')} 
                    isSelected={selectedItems.includes('Discapacidad')}
                    onSelect={() => toggleSelection('Discapacidad')}
                />
                <SyncItem 
                    label="Información Adicional" 
                    action="Editar" 
                    subItems={['Estatura', 'Peso', 'Sexo', 'Grupo Sanguíneo']} 
                    values={[
                        latestMetrics?.height_cm ? `${latestMetrics.height_cm} cm` : '-',
                        latestMetrics?.weight_kg ? `${latestMetrics.weight_kg} kg` : '-',
                        person?.gender || '-',
                        '-' // TODO: Blood type
                    ]}
                    onActionClick={(e) => handleActionClick(e, 'metrics', 'Información Adicional', 'Editar')}
                    isSelected={selectedItems.includes('Información Adicional')}
                    onSelect={() => toggleSelection('Información Adicional')}
                />
                <SyncItem 
                    label="Notas" 
                    action="Editar"
                    onActionClick={(e) => handleActionClick(e, 'notes', 'Notas', 'Editar')}
                    values={person?.notes ? [person.notes] : []}
                    isSelected={selectedItems.includes('Notas')}
                    onSelect={() => toggleSelection('Notas')}
                />
                <SyncItem 
                    label="Fecha de Nacimiento" 
                    action="Editar" 
                    onActionClick={(e) => handleActionClick(e, 'birth_date', 'Fecha de Nacimiento', 'Editar')} 
                    values={person?.birth_date ? [person.birth_date] : []}
                    isSelected={selectedItems.includes('Fecha de Nacimiento')}
                    onSelect={() => toggleSelection('Fecha de Nacimiento')}
                />
                <SyncItem 
                    label="Medicamentos que Afectan la Frecuencia Cardiaca" 
                    action="Agregar"
                    onActionClick={(e) => handleActionClick(e, 'medication', 'Medicamentos que Afectan la Frecuencia Cardiaca', 'Agregar')}
                    values={medications.filter(m => m.notes?.toLowerCase().includes('frecuencia cardiaca')).map(m => `${m.name} (${m.dosage || ''})`)}
                    isSelected={selectedItems.includes('Medicamentos que Afectan la Frecuencia Cardiaca')}
                    onSelect={() => toggleSelection('Medicamentos que Afectan la Frecuencia Cardiaca')}
                />
                <SyncItem 
                    label="Objetivo" 
                    action="Editar" 
                    subItems={['Pérdida de peso', 'Aumento de masa muscular', 'Control de índice glucémico', 'Otros / especificar']} 
                    onActionClick={(e) => handleActionClick(e, 'goal', 'Objetivo', 'Editar')}
                    values={person?.health_goal ? [person.health_goal] : []}
                    isSelected={selectedItems.includes('Objetivo')}
                    onSelect={() => toggleSelection('Objetivo')}
                />
            </div>
        </div>
    );
};

export default SummaryPanel;
