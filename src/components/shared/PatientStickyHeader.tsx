
import React, { FC, useMemo } from 'react';
import { Person, Allergy, MedicalHistory, Log, ConsultationWithLabs } from '../../types';
import { ICONS } from '../../pages/AuthPage';
import PlanStatusIndicator from './PlanStatusIndicator';
import { Card, Flex, ResponsiveFlex } from '../layout';

interface PatientStickyHeaderProps {
    person: Person;
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    consultations: ConsultationWithLabs[];
    logs: Log[];
    onBack?: () => void;
    onOpenQuickActions?: () => void;
}

const PatientStickyHeader: FC<PatientStickyHeaderProps> = ({ person, allergies, medicalHistory, consultations, logs, onBack, onOpenQuickActions }) => {
    
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
    const { latestWeight, latestImc, weightChange, weightTrend, previousDateLabel } = useMemo(() => {
        const sortedConsults = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
        
        if (sortedConsults.length === 0) return { latestWeight: null, latestImc: null, weightChange: null, weightTrend: null, previousDateLabel: null };

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
            
            if (daysDiff > 300) prevDate = 'año ant.';
            else if (daysDiff > 30) prevDate = 'mes ant.';
            else prevDate = 'cita ant.';
        }

        return {
            latestWeight: current?.weight_kg,
            latestImc: current?.imc,
            weightChange: change,
            weightTrend: trend,
            previousDateLabel: prevDate
        };
    }, [consultations]);

    const breadcrumbStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        marginBottom: '0.75rem'
    };

    const isMobile = window.innerWidth <= 768;

    const avatarStyle: React.CSSProperties = {
        width: isMobile ? '52px' : '72px',
        height: isMobile ? '52px' : '72px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '1.5rem' : '2.5rem',
        fontWeight: 700,
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
    };

    return (
        <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
            {/* Navigation Header / Breadcrumbs */}
            <div style={breadcrumbStyle}>
                <button 
                    onClick={onBack} 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: 'none', 
                        border: 'none', 
                        padding: 0, 
                        color: 'var(--primary-color)', 
                        fontWeight: 600, 
                        fontSize: '0.9rem',
                        cursor: 'pointer' 
                    }}
                >
                    {ICONS.chevronLeft} Pacientes
                </button>
                {isMobile && onOpenQuickActions && (
                    <button
                        onClick={onOpenQuickActions}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary-dark)',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '999px',
                            padding: '0.4rem 0.8rem',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            minHeight: '36px'
                        }}
                    >
                        ⚡ Acciones
                    </button>
                )}
            </div>

            {/* Identity Card */}
            <Card style={{ padding: isMobile ? '1rem' : '1.5rem', overflow: 'visible', borderRadius: isMobile ? '18px' : '24px' }}>
                <ResponsiveFlex $align={isMobile ? 'flex-start' : 'center'} $justify="space-between" $gap="1rem">
                    <Flex $align="center" $gap={isMobile ? '0.85rem' : '1.25rem'} style={{ flex: 1, width: 'auto' }}>
                        <div style={avatarStyle}>
                            {person.avatar_url ? (
                                <img src={person.avatar_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                            ) : getInitials(person.full_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap'}}>
                                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {person.full_name}
                                </h1>
                                <PlanStatusIndicator planEndDate={person.subscription_end_date} />
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: isMobile ? '0.8rem' : '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{person.gender === 'male' ? '👨 Masculino' : '👩 Femenino'}</span>
                                <span>•</span>
                                <span>{calculateAge(person.birth_date)}</span>
                                {person.folio && (
                                    <>
                                        <span>•</span>
                                        <span style={{fontWeight: 600}}>ID: {person.folio}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </Flex>

                    {/* Weight Analytical Indicator / Mobile Chips */}
                    {latestWeight && (
                        <div style={{ 
                            padding: isMobile ? '0.6rem 0.85rem' : '0.5rem 1rem', 
                            backgroundColor: 'var(--surface-hover-color)', 
                            borderRadius: '14px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: isMobile ? 'row' : 'column',
                            alignItems: isMobile ? 'center' : 'flex-end',
                            justifyContent: 'space-between',
                            gap: isMobile ? '0.75rem' : '0',
                            width: isMobile ? '100%' : 'auto',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700}}>Peso Último</span>
                                    <span style={{fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 800, color: 'var(--text-color)', lineHeight: 1.1}}>
                                        {latestWeight} <span style={{fontSize: '0.85rem', fontWeight: 500}}>kg</span>
                                    </span>
                                </div>
                                {latestImc && (
                                    <div style={{display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem'}}>
                                        <span style={{fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700}}>IMC</span>
                                        <span style={{fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1.1}}>
                                            {latestImc}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {weightChange && weightTrend && (
                                <div style={{
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    color: weightTrend === 'down' ? '#10B981' : weightTrend === 'up' ? '#EF4444' : 'var(--text-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: weightTrend === 'down' ? 'rgba(16,185,129,0.1)' : weightTrend === 'up' ? 'rgba(239,68,68,0.1)' : 'var(--border-color)',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '8px'
                                }}>
                                    <span>{weightTrend === 'down' ? '⬇️' : weightTrend === 'up' ? '⬆️' : '➖'}</span>
                                    <span>{weightChange} kg ({previousDateLabel})</span>
                                </div>
                            )}
                        </div>
                    )}
                </ResponsiveFlex>
            </Card>
        </div>
    );
};

export default PatientStickyHeader;
