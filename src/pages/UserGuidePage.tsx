import React, { FC } from 'react';
import { styles } from '../constants';
import { ICONS } from './AuthPage';

// Importar los nuevos componentes modulares de la guía
import PatientManagementGuide from '../components/user_guide/PatientManagementGuide';
import ClinicalRecordGuide from '../components/user_guide/ClinicalRecordGuide';
import ConsultationModeGuide from '../components/user_guide/ConsultationModeGuide';
import AgendaGuide from '../components/user_guide/AgendaGuide';
import ToolsGuide from '../components/user_guide/ToolsGuide';
import AiGuide from '../components/user_guide/AiGuide';
import NetworkGuide from '../components/user_guide/NetworkGuide';
import FinanceGuide from '../components/user_guide/FinanceGuide';

const UserGuidePage: FC = () => {
    return (
        <div className="fade-in" style={{ maxWidth: '900px' }}>
            <div style={styles.pageHeader}>
                <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <span style={{color: 'var(--primary-color)'}}>{ICONS.book}</span>
                    Guía de Uso del Sistema
                </h1>
            </div>
            <p style={{ marginTop: '-1.5rem', marginBottom: '2rem', color: 'var(--text-light)' }}>
                Bienvenido al manual de usuario. Aquí encontrarás guías detalladas sobre cómo utilizar cada módulo de Zegna Nutrición para maximizar tu eficiencia.
            </p>

            <PatientManagementGuide />
            <ClinicalRecordGuide />
            <ConsultationModeGuide />
            <AgendaGuide />
            <ToolsGuide />
            <AiGuide />
            <NetworkGuide />
            <FinanceGuide />
        </div>
    );
};

export default UserGuidePage;