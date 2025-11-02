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

    return (
        <div>
            <nav className="sub-tabs">
                 <button className={`sub-tab-button ${activeSubTab === 'energia' ? 'active' : ''}`} onClick={() => setActiveSubTab('energia')}>Requerimientos Energéticos</button>
                <button className={`sub-tab-button ${activeSubTab === 'antropometria' ? 'active' : ''}`} onClick={() => setActiveSubTab('antropometria')}>Antropometría y Riesgo</button>
                <button className={`sub-tab-button ${activeSubTab === 'renal' ? 'active' : ''}`} onClick={() => setActiveSubTab('renal')}>Función Renal</button>
                <button className={`sub-tab-button ${activeSubTab === 'diabetes' ? 'active' : ''}`} onClick={() => setActiveSubTab('diabetes')}>Diabetes</button>
                <button className={`sub-tab-button ${activeSubTab === 'poblaciones' ? 'active' : ''}`} onClick={() => setActiveSubTab('poblaciones')}>Poblaciones Específicas</button>
                <button className={`sub-tab-button ${activeSubTab === 'soporte' ? 'active' : ''}`} onClick={() => setActiveSubTab('soporte')}>Soporte Nutricional</button>
                <button className={`sub-tab-button ${activeSubTab === 'tamizaje' ? 'active' : ''}`} onClick={() => setActiveSubTab('tamizaje')}>Tamizaje</button>
                <button className={`sub-tab-button ${activeSubTab === 'pediatria' ? 'active' : ''}`} onClick={() => setActiveSubTab('pediatria')}>Pediatría</button>
            </nav>
            {renderContent()}
        </div>
    );
};

export default QuickTools;
