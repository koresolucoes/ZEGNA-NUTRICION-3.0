import React, { FC, useState } from 'react';
import { DietLog, ExerciseLog, DietPlanHistoryItem, ConsultationWithLabs, DailyCheckin } from '../../../types';
import { PlansTab } from '../tabs/PlansTab';
import { ProgressTab } from '../tabs/ProgressTab';
import { CalculatedPlansTab } from '../tabs/CalculatedPlansTab';
import { DailyTrackingTab } from '../tabs/DailyTrackingTab';

interface PlanesYSeguimientoContainerProps {
    allDietLogs: DietLog[];
    allExerciseLogs: ExerciseLog[];
    planHistory: DietPlanHistoryItem[];
    consultations: ConsultationWithLabs[];
    dailyCheckins: DailyCheckin[];
    isMobile: boolean;
    hasAiFeature: boolean;
    onGenerateMeal: () => void;
    onGenerateExercise: () => void;
    onAddManualDiet: () => void;
    onAddManualExercise: () => void;
    onEditDietLog: (log: DietLog) => void;
    onViewDietLog: (log: DietLog) => void;
    onEditExerciseLog: (log: ExerciseLog) => void;
    onViewExerciseLog: (log: ExerciseLog) => void;
    onLoadPlan: (plan: DietPlanHistoryItem) => void;
    openModal: (action: any, id: string, text: string) => void;
}

export const PlanesYSeguimientoContainer: FC<PlanesYSeguimientoContainerProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState('actuales');

    const renderSubContent = () => {
        switch (activeSubTab) {
            case 'actuales':
                return <PlansTab 
                    allDietLogs={props.allDietLogs}
                    allExerciseLogs={props.allExerciseLogs}
                    hasAiFeature={props.hasAiFeature}
                    onGenerateMeal={props.onGenerateMeal}
                    onGenerateExercise={props.onGenerateExercise}
                    onAddManualDiet={props.onAddManualDiet}
                    onAddManualExercise={props.onAddManualExercise}
                    onEditDietLog={props.onEditDietLog}
                    onViewDietLog={props.onViewDietLog}
                    onEditExerciseLog={props.onEditExerciseLog}
                    onViewExerciseLog={props.onViewExerciseLog}
                    openModal={props.openModal}
                />;
            case 'progreso':
                return <ProgressTab consultations={props.consultations} isMobile={props.isMobile} />;
            case 'historial':
                return <CalculatedPlansTab 
                    planHistory={props.planHistory} 
                    navigate={props.onLoadPlan as any} // Cast because it navigates via parent
                    openModal={props.openModal}
                />;
            case 'registros':
                return <DailyTrackingTab checkins={props.dailyCheckins} />;
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activeSubTab === 'actuales' ? 'active' : ''}`} onClick={() => setActiveSubTab('actuales')}>Planes Actuales</button>
                <button className={`sub-tab-button ${activeSubTab === 'progreso' ? 'active' : ''}`} onClick={() => setActiveSubTab('progreso')}>Progreso (Gráficas)</button>
                <button className={`sub-tab-button ${activeSubTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveSubTab('historial')}>Historial de Planes</button>
                <button className={`sub-tab-button ${activeSubTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveSubTab('registros')}>Registros Diarios</button>
            </nav>
            {renderSubContent()}
        </div>
    );
};
