// FIX: Import React to provide the 'React' namespace for CSSProperties.
import React from 'react';
import { Person, ConsultationWithLabs } from '../../../types';

export interface ToolProps {
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    handleSaveToLog: (calculatorKey: string, logType: string, description: string, data: { inputs: any; result: any }) => Promise<void>;
    saveStatus: Record<string, 'idle' | 'saving' | 'success' | 'error'>;
}

export const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem'
};