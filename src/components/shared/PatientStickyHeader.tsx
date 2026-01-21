
import React, { FC, useMemo } from 'react';
import { Person, Allergy, MedicalHistory, Log, ConsultationWithLabs } from '../../types';
import { ICONS } from '../../pages/AuthPage';
import PlanStatusIndicator from './PlanStatusIndicator';
import SparklineChart from './SparklineChart';

interface PatientStickyHeaderProps {
    person: Person;
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    consultations: ConsultationWithLabs[];
    logs: Log[];
}

const PatientStickyHeader: FC<PatientStickyHeaderProps> = ({ person, allergies, medicalHistory, consultations, logs }) => {
    
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

    const mainCondition = medicalHistory?.[0]?.condition || 'Ninguna registrada';
    const hasAllergies = allergies.length > 0;
    const pinnedNote = logs?.[0] || null;

    const { latestWeight, latestImc, weightTrend, imcTrend } = useMemo(() => {
        const sortedConsults = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
        const last5Consults = sortedConsults.slice(-5);
        
        return {
            latestWeight: sortedConsults[sortedConsults.length - 1]?.weight_kg || null,
            latestImc: sortedConsults[sortedConsults.length - 1]?.imc || null,
            weightTrend: last5Consults.map(c => c.weight_kg!).filter(v => v != null),
            imcTrend: last5Consults.map(c => c.imc!).filter(v => v != null),
        };
    }, [consultations]);

    // Base styles
    const headerStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)', 
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '1rem 2rem', 
        marginBottom: '1.5rem', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
    };
    
    const infoBlockStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: '120px' }; // Reduced minWidth
    const valueWithChartStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: '0.75rem' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' };
    const valueStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-color)' };
    const alertValueStyle: React.CSSProperties = { ...valueStyle, color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' };
    
    return (
        <>
            <style>{`
                .patient-sticky-header {
                    position: sticky;
                    top: 0;
                    z-index: 900; /* Slightly less than navbar/sidebar/modals */
                }
                
                /* Mobile Optimizations */
                @media (max-width: 960px) {
                    .patient-sticky-header {
                        position: relative !important; /* Unstick on mobile so it scrolls away */
                        padding: 1rem !important;
                        margin-bottom: 1rem !important;
                        z-index: 1;
                        gap: 1rem !important;
                    }
                    
                    /* Hide detailed metrics and bottom alerts on mobile to save vertical space */
                    .header-right-block, 
                    .header-bottom-row {
                        display: none !important;
                    }
                    
                    /* Adjust avatar size for mobile */
                    .header-avatar {
                        width: 48px !important;
                        height: 48px !important;
                    }
                    
                    .header-name {
                        font-size: 1.2rem !important;
                    }
                }
            `}</style>
            
            <div className="patient-sticky-header" style={headerStyle}>
                {/* Left Block: Patient Info */}
                <div style={{ flex: '2 1 300px', display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                    <img 
                        src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name || '?'}&radius=50`}
                        alt="Avatar del paciente"
                        className="header-avatar"
                        style={{width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}}
                    />
                    <div style={{minWidth: 0, overflow: 'hidden'}}>
                        <h1 className="header-name" style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.full_name}</h1>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '1rem' }}>{calculateAge(person.birth_date)}</p>
                            {/* Show a small plan indicator next to name on mobile since we hide the big block */}
                            <div className="header-right-block" style={{display: 'none'}}> 
                                {/* This div is just a logic placeholder, we use CSS to hide the main block below */}
                            </div>
                             <div style={{display: 'none'}} className="mobile-only-indicator">
                                 {/* Could add mobile specific elements here via CSS media queries if needed */}
                             </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Block: Key Metrics (Hidden on Mobile via CSS class) */}
                <div className="header-right-block" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', flex: '3 1 500px', justifyContent: 'flex-end' }}>
                    <div style={infoBlockStyle}>
                        <span style={labelStyle}>Último Peso</span>
                        <div style={valueWithChartStyle}>
                            <span style={valueStyle}>{latestWeight ? `${latestWeight} kg` : 'N/A'}</span>
                            <SparklineChart data={weightTrend} />
                        </div>
                    </div>
                    <div style={infoBlockStyle}>
                        <span style={labelStyle}>Último IMC</span>
                         <div style={valueWithChartStyle}>
                            <span style={valueStyle}>{latestImc || 'N/A'}</span>
                            <SparklineChart data={imcTrend} />
                        </div>
                    </div>
                    <div style={infoBlockStyle}>
                        <span style={labelStyle}>Plan</span>
                        <PlanStatusIndicator planEndDate={person.subscription_end_date} />
                    </div>
                </div>
                
                {/* Bottom Row: Alerts (Hidden on Mobile via CSS class) */}
                <div className="header-bottom-row" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                     <div style={infoBlockStyle}>
                        <span style={labelStyle}>{ICONS.briefcase} Condición Principal</span>
                        <span style={valueStyle}>{mainCondition}</span>
                    </div>
                    <div style={infoBlockStyle}>
                        <span style={labelStyle}>Alergias</span>
                        <span style={hasAllergies ? alertValueStyle : valueStyle}>
                            {hasAllergies ? `${allergies.length} Registrada(s)` : 'Ninguna'}
                        </span>
                    </div>
                    {pinnedNote && (
                        <div style={{...infoBlockStyle, flex: 1}}>
                             <span style={labelStyle}>📌 Nota Reciente</span>
                             <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pinnedNote.description}
                             </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PatientStickyHeader;
