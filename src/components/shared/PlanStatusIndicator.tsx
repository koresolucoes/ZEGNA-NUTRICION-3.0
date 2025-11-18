
import React, { FC } from 'react';

const PlanStatusIndicator: FC<{ planEndDate: string | null | undefined }> = ({ planEndDate }) => {
    let statusText = 'Sin Plan';
    let bgColor = '#F3F4F6'; // Gris claro
    let textColor = '#4B5563'; // Gris oscuro
    let borderColor = '#D1D5DB';
    let dotColor = '#9CA3AF';

    if (planEndDate) {
        const endDate = new Date(planEndDate);
        // Create a UTC date for today to compare dates accurately.
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        if (endDate >= todayUTC) {
            statusText = 'Activo';
            bgColor = '#DCFCE7'; // Verde claro (Green-100)
            textColor = '#166534'; // Verde oscuro (Green-800)
            borderColor = '#86EFAC'; // Green-300
            dotColor = '#16A34A'; // Green-600
        } else {
            statusText = 'Vencido';
            bgColor = '#FEE2E2'; // Rojo claro (Red-100)
            textColor = '#991B1B'; // Rojo oscuro (Red-800)
            borderColor = '#FCA5A5'; // Red-300
            dotColor = '#DC2626'; // Red-600
        }
    }

    return (
        <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontWeight: 600, 
            fontSize: '0.75rem', 
            padding: '4px 12px', 
            borderRadius: '999px', 
            backgroundColor: bgColor, 
            color: textColor,
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor
            }}></span>
            <span>{statusText}</span>
        </div>
    );
};

export default PlanStatusIndicator;
