
import React, { FC, useMemo } from 'react';
import { Person, Allergy, MedicalHistory, Log, ConsultationWithLabs } from '../../types';
import { ICONS } from '../../pages/AuthPage';
import PlanStatusIndicator from './PlanStatusIndicator';

interface PatientStickyHeaderProps {
    person: Person;
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    consultations: ConsultationWithLabs[];
    logs: Log[];
    onBack?: () => void;
}

const PatientStickyHeader: FC<PatientStickyHeaderProps> = ({ person, allergies, medicalHistory, consultations, logs, onBack }) => {
    
    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate.replace(/-/g, '/'));
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} años`;
    };
    
    const getInitials = (name: string) => {
        return name ? name.trim().charAt(0).toUpperCase() : '?';
    };

    // Derived Metrics & Weight Analysis
    const { latestWeight, weightChange, weightTrend, previousDateLabel } = useMemo(() => {
        const sortedConsults = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
        
        if (sortedConsults.length === 0) return { latestWeight: null, weightChange: null, weightTrend: null, previousDateLabel: null };

        const current = sortedConsults[sortedConsults.length - 1];
        const previous = sortedConsults.length > 1 ? sortedConsults[sortedConsults.length - 2] : null;
        
        let change = null;
        let trend = null;
        let prevDate = null;

        if (current.weight_kg && previous && previous.weight_kg) {
            const diff = current.weight_kg - previous.weight_kg;
            change = Math.abs(diff).toFixed(1);
            trend = diff < 0 ? 'down' : diff > 0 ? 'up' : 'same';
            
            // Calculate vague time difference
            const timeDiff = new Date(current.consultation_date).getTime() - new Date(previous.consultation_date).getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (daysDiff > 300) prevDate = 'año anterior';
            else if (daysDiff > 30) prevDate = 'mes anterior';
            else prevDate = 'cita anterior';
        }

        return {
            latestWeight: current?.weight_kg,
            weightChange: change,
            weightTrend: trend,
            previousDateLabel: prevDate
        };
    }, [consultations]);

    // Styles
    const containerStyle: React.CSSProperties = {
        marginBottom: '1.5rem',
        animation: 'fadeIn 0.3s ease-out'
    };

    const breadcrumbStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        marginBottom: '1rem',
        cursor: 'pointer'
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between'
    };

    const avatarStyle: React.CSSProperties = {
        width: '72px',
        height: '72px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        fontWeight: 700,
        flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    };

    return (
        <div style={containerStyle}>
            {/* Breadcrumbs */}
            <div style={breadcrumbStyle}>
                <span onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {ICONS.users} Pacientes
                </span>
                <span>/</span>
                <span style={{ color: 'var(--text-color)', fontWeight: 600 }}>{person.full_name}</span>
            </div>

            {/* Identity Card */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: 1 }}>
                    <div style={avatarStyle}>
                        {person.avatar_url ? (
                            <img src={person.avatar_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                        ) : getInitials(person.full_name)}
                    </div>
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem'}}>
                            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px' }}>
                                {person.full_name}
                            </h1>
                            <PlanStatusIndicator planEndDate={person.subscription_end_date} />
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            {person.gender === 'male' ? 'Masculino' : 'Femenino'}, {calculateAge(person.birth_date)} • ID: {person.folio || 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Weight Analytical Indicator (Replaces Old Grid) */}
                {latestWeight && (
                    <div style={{ 
                        padding: '0.75rem 1.25rem', 
                        backgroundColor: 'var(--surface-hover-color)', 
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem'}}>
                            <span style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)'}}>
                                {latestWeight} <span style={{fontSize: '1rem', fontWeight: 500}}>kg</span>
                            </span>
                        </div>
                        
                        {weightChange && weightTrend && (
                            <div style={{
                                fontSize: '0.85rem', 
                                fontWeight: 600, 
                                color: weightTrend === 'down' ? '#10B981' : weightTrend === 'up' ? '#EF4444' : 'var(--text-light)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '2px'
                            }}>
                                <span>{weightTrend === 'down' ? '⬇️' : weightTrend === 'up' ? '⬆️' : '➖'}</span>
                                <span>{weightChange} kg vs {previousDateLabel}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientStickyHeader;
