import React, { FC } from 'react';
import { ConsultationWithLabs } from '../../../types';
import ProgressChart from '../../shared/ProgressChart';

interface ProgressTabProps {
    consultations: ConsultationWithLabs[];
    isMobile: boolean;
}

export const ProgressTab: FC<ProgressTabProps> = ({ consultations, isMobile }) => {
    const sortedConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());

    const glucoseData = sortedConsultations.filter(c => c.lab_results?.[0]?.glucose_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].glucose_mg_dl! }));
    const cholesterolData = sortedConsultations.filter(c => c.lab_results?.[0]?.cholesterol_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].cholesterol_mg_dl! }));
    const triglyceridesData = sortedConsultations.filter(c => c.lab_results?.[0]?.triglycerides_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].triglycerides_mg_dl! }));
    const hba1cData = sortedConsultations.filter(c => c.lab_results?.[0]?.hba1c != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].hba1c! }));

    return (
        <section className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                <ProgressChart title="Niveles de Glucosa" data={glucoseData} unit="mg/dl" />
                <ProgressChart title="Niveles de Colesterol" data={cholesterolData} unit="mg/dl" />
                <ProgressChart title="Niveles de Triglicéridos" data={triglyceridesData} unit="mg/dl" />
                <ProgressChart title="Niveles de HbA1c" data={hba1cData} unit="%" />
            </div>
        </section>
    );
};
