
import React, { FC } from 'react';
import { Person, ConsultationWithLabs } from '../../types';

// Importar los nuevos componentes de herramientas modulares
import EnergyRequirementsTool from './tools/EnergyRequirementsTool';
import AnthropometryTools from './tools/AnthropometryTools';
import RenalTools from './tools/RenalTools';
import DiabetesTools from './tools/DiabetesTools';
import SpecialPopulationsTools from './tools/SpecialPopulationsTools';
import NutritionalSupportTools from './tools/NutritionalSupportTools';
import ScreeningTools from './tools/ScreeningTools';
import PediatricsTools from './tools/PediatricsTools';
import { ToolProps } from './tools/tool-types';


interface QuickToolsProps {
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    activeSubTab: string;
    setActiveSubTab: (tab: string) => void;
    handleSaveToLog: (calculatorKey: string, logType: string, description: string, data: { inputs: any; result: any }) => Promise<void>;
    saveStatus: Record<string, 'idle' | 'saving' | 'success' | 'error'>;
}

const QuickTools: FC<QuickToolsProps> = ({ selectedPerson, lastConsultation, activeSubTab, setActiveSubTab, handleSaveToLog, saveStatus }) => {
    
    const renderContent = () => {
        const toolProps: ToolProps = { selectedPerson, lastConsultation, handleSaveToLog, saveStatus };
        
        switch (activeSubTab) {
            case 'energia':
                return <EnergyRequirementsTool {...toolProps} />;
            case 'antropometria':
                return <AnthropometryTools {...toolProps} />;
            case 'renal':
                return <RenalTools {...toolProps} />;
            case 'diabetes':
                return <DiabetesTools {...toolProps} />;
            case 'poblaciones':
                return <SpecialPopulationsTools {...toolProps} />;
            case 'soporte':
                return <NutritionalSupportTools {...toolProps} />;
            case 'tamizaje':
                return <ScreeningTools {...toolProps} />;
            case 'pediatria':
                return <PediatricsTools {...toolProps} />;
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
        { key: 'poblaciones', label: 'Poblaciones' },
        { key: 'soporte', label: 'Soporte' },
        { key: 'tamizaje', label: 'Tamizaje' },
        { key: 'pediatria', label: 'Pediatría' }
    ];

    return (
        <div className="fade-in">
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