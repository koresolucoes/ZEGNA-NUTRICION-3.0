
import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Person, ConsultationWithLabs } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

// Importar los nuevos componentes de herramientas modulares
import EnergyRequirementsTool from './tools/EnergyRequirementsTool';
import AnthropometryTools from './tools/AnthropometryTools';
import RenalTools from './tools/RenalTools';
import DiabetesTools from './tools/DiabetesTools';
import NutritionalSupportTools from './tools/NutritionalSupportTools';
import { ToolProps } from './tools/tool-types';

interface QuickToolsProps {
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    activeSubTab: string;
    setActiveSubTab: (tab: string) => void;
    handleSaveToLog: (calculatorKey: string, logType: string, description: string, data: { inputs: any; result: any }) => Promise<void>;
    saveStatus: Record<string, 'idle' | 'saving' | 'success' | 'error'>;
    persons?: Person[]; // New prop for modal search
    onPersonSelect?: (person: Person | null) => void; // New prop to update parent state
}

const modalRoot = document.getElementById('modal-root');

const QuickTools: FC<QuickToolsProps> = ({ 
    selectedPerson, 
    lastConsultation, 
    activeSubTab, 
    setActiveSubTab, 
    handleSaveToLog, 
    saveStatus,
    persons = [],
    onPersonSelect
}) => {
    // Modal State for patient selection
    const [isPatientSelectModalOpen, setIsPatientSelectModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [pendingSaveData, setPendingSaveData] = useState<{key: string, type: string, desc: string, data: any} | null>(null);
    
    // Notification State (Toast)
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        // Auto-dismiss after 3 seconds
        setTimeout(() => setNotification(null), 3000);
    };

    const handleToolSaveRequest = async (calculatorKey: string, logType: string, description: string, data: { inputs: any; result: any }) => {
        try {
            if (selectedPerson) {
                await handleSaveToLog(calculatorKey, logType, description, data);
                showNotification('success', 'Cálculo guardado en el historial del paciente');
            } else {
                setPendingSaveData({ key: calculatorKey, type: logType, desc: description, data: data });
                setIsPatientSelectModalOpen(true);
            }
        } catch (error) {
            showNotification('error', 'Error al guardar el cálculo');
        }
    };
    
    // Filter persons for modal
    const modalFilteredPersons = useMemo(() => {
        return persons.filter(p => 
            p.full_name.toLowerCase().includes(modalSearchTerm.toLowerCase())
        );
    }, [persons, modalSearchTerm]);

    const handleSelectFromModal = (person: Person) => {
        if (onPersonSelect) {
            onPersonSelect(person);
            
            setIsPatientSelectModalOpen(false);
            
            // Save logically after selection
            if (pendingSaveData) {
                // We simulate the save here since we have the data and the person ID
                // Ideally we reuse the parent function but we need the ID.
                // For UI feedback we assume success if the parent updates the state
                import('../../supabase').then(({ supabase }) => {
                     supabase.auth.getUser().then(({ data: { user } }) => {
                         supabase.from('logs').insert({
                            person_id: person.id,
                            log_type: pendingSaveData.type,
                            description: pendingSaveData.desc,
                            created_by_user_id: user?.id
                        }).then(({ error }) => {
                            if (error) {
                                showNotification('error', 'Error al guardar');
                            } else {
                                showNotification('success', `Guardado en historial de ${person.full_name}`);
                            }
                            setPendingSaveData(null);
                        });
                     });
                });
            }
        }
    };
    
    const renderContent = () => {
        // Pass the new intercepted handler instead of the original one
        const toolProps: ToolProps = { 
            selectedPerson, 
            lastConsultation, 
            handleSaveToLog: handleToolSaveRequest, 
            saveStatus 
        };
        
        switch (activeSubTab) {
            case 'energia':
                return <EnergyRequirementsTool {...toolProps} />;
            case 'antropometria':
                return <AnthropometryTools {...toolProps} />;
            case 'renal':
                return <RenalTools {...toolProps} />;
            case 'diabetes':
                return <DiabetesTools {...toolProps} />;
            case 'soporte':
                return <NutritionalSupportTools {...toolProps} />;
            default:
                return (
                    <div className="fade-in">
                        <p>Selecciona una categoría de herramientas.</p>
                    </div>
                );
        }
    }

    const tools = [
        { key: 'energia', label: 'Energía' },
        { key: 'antropometria', label: 'Antropometría' },
        { key: 'renal', label: 'Renal' },
        { key: 'diabetes', label: 'Diabetes' },
        { key: 'soporte', label: 'Soporte' },
    ];

    return (
        <div className="fade-in" style={{position: 'relative'}}>
             {/* Toast Notification */}
             {notification && createPortal(
                <div className="fade-in" style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    backgroundColor: 'var(--surface-color)',
                    borderLeft: `4px solid ${notification.type === 'success' ? '#10B981' : '#EF4444'}`,
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    zIndex: 2000,
                    color: 'var(--text-color)',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                }}>
                    <span style={{fontSize: '1.2rem'}}>
                        {notification.type === 'success' ? '✅' : '❌'}
                    </span>
                    {notification.message}
                </div>,
                document.body
            )}

             {/* Modal de Selección de Paciente */}
            {isPatientSelectModalOpen && modalRoot && createPortal(
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Guardar Cálculo</h2>
                            <button onClick={() => setIsPatientSelectModalOpen(false)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Selecciona un paciente para asignar este cálculo a su historial.</p>
                            
                            <input 
                                type="text" 
                                placeholder="Buscar paciente..." 
                                value={modalSearchTerm}
                                onChange={e => setModalSearchTerm(e.target.value)}
                                style={{...styles.input, marginBottom: '1rem'}}
                                autoFocus
                            />
                            
                            <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
                                {modalFilteredPersons.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => handleSelectFromModal(p)}
                                        className="nav-item-hover"
                                        style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                                    >
                                        <span>{p.full_name}</span>
                                        <span style={{fontSize: '1.2rem', color: 'var(--primary-color)'}}>→</span>
                                    </div>
                                ))}
                                {modalFilteredPersons.length === 0 && (
                                    <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-light)'}}>No se encontraron resultados.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                modalRoot
            )}

             <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '2rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem'
            }}>
                {tools.map(tool => (
                    <button
                        key={tool.key}
                        onClick={() => setActiveSubTab(tool.key)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: activeSubTab === tool.key ? 600 : 500,
                            backgroundColor: activeSubTab === tool.key ? 'var(--primary-light)' : 'transparent',
                            color: activeSubTab === tool.key ? 'var(--primary-dark)' : 'var(--text-light)',
                            transition: 'all 0.2s',
                            border: activeSubTab === tool.key ? '1px solid var(--primary-color)' : '1px solid transparent'
                        }}
                        className="nav-item-hover"
                    >
                        {tool.label}
                    </button>
                ))}
            </div>
            
            {renderContent()}
        </div>
    );
};

export default QuickTools;
