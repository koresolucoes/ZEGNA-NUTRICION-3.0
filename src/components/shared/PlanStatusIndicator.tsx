
import React, { FC } from 'react';
import { styles } from '../../constants';

const PlanStatusIndicator: FC<{ planEndDate: string | null | undefined }> = ({ planEndDate }) => {
    let statusText = 'Sin Plan';
    let dotColor = 'var(--text-light)';
    let textColor = 'var(--text-light)';
    let details = '';

    if (planEndDate) {
        // Dates from DB are YYYY-MM-DD. new Date() treats them as UTC midnight.
        const endDate = new Date(planEndDate);

        const today = new Date();
        // Create a UTC date for today to compare dates accurately.
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        if (endDate >= todayUTC) {
            statusText = 'Activo';
            dotColor = 'var(--primary-color)';
            textColor = 'var(--primary-dark)';
            const diffTime = endDate.getTime() - todayUTC.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                details = '(Vence hoy)';
            } else {
                details = `(Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''})`;
            }
        } else {
            statusText = 'Vencido';
            dotColor = 'var(--error-color)';
            textColor = 'var(--error-color)';
            // Adjust for display by getting the date parts in UTC
            const displayDate = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
            details = `(Venció el ${displayDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })})`;
        }
    }

    return (
        <div style={styles.planStatus}>
            <span style={{ ...styles.statusDot, backgroundColor: dotColor }} aria-hidden="true" />
            <span style={{ color: textColor }}>{statusText}</span>
            {details && <span style={{fontSize: '0.85rem', color: 'var(--text-light)', marginLeft: '8px'}}>{details}</span>}
        </div>
    );
};

export default PlanStatusIndicator;
