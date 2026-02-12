
import React, { FC, useMemo } from 'react';
import { Person, Allergy, MedicalHistory, Log, ConsultationWithLabs } from '../../types';
import { ICONS } from '../../pages/AuthPage';

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
    
    const getInitials = (name: string) => {
        return name ? name.trim().charAt(0).toUpperCase() : '?';
    };

    const mainCondition = medicalHistory?.[0]?.condition || 'Ninguna registrada';
    const hasAllergies = allergies.length > 0;
    const pinnedNote = logs?.[0] || null;

    const { latestWeight, weightChangeText, weightChangeColor } = useMemo(() => {
        // Sort ascending (oldest to newest)
        const sortedConsults = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
        
        const current = sortedConsults[sortedConsults.length - 1];
        if (!current || !current.weight_kg) return { latestWeight: null, weightChangeText: null, weightChangeColor: 'var(--text-light)' };

        const currentWeight = current.weight_kg;
        const currentDate = new Date(current.consultation_date);

        // Find comparison point (approx 1 month ago, or previous record)
        let prevWeight = null;
        let timeLabel = 'anterior';

        // Try to find a record from roughly 1 month ago (25-35 days)
        const oneMonthAgo = new Date(currentDate);
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        // Find closest consultation to one month ago that isn't the current one
        const pastConsults = sortedConsults.slice(0, sortedConsults.length - 1);
        
        if (pastConsults.length > 0) {
            // Find closest to target date
            const closest = pastConsults.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.consultation_date).getTime() - oneMonthAgo.getTime());
                const currDiff = Math.abs(new Date(curr.consultation_date).getTime() - oneMonthAgo.getTime());
                return currDiff < prevDiff ? curr : prev;
            });
            
            if (closest && closest.weight_kg) {
                prevWeight = closest.weight_kg;
                // Determine label based on time difference
                const diffDays = Math.ceil(Math.abs(currentDate.getTime() - new Date(closest.consultation_date).getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays >= 25 && diffDays <= 35) timeLabel = 'mes anterior';
                else if (diffDays > 35) timeLabel = 'última vez';
                else timeLabel = 'última vez';
            }
        }

        let changeText = '';
        let color = 'var(--text-light)';

        if (prevWeight !== null) {
            const diff = currentWeight - prevWeight;
            if (diff < 0) {
                changeText = `(⬇️ ${Math.abs(diff).toFixed(1)} kg vs ${timeLabel})`;
                color = '#10B981'; // Green for weight loss (usually good in clinical context, or use neutral)
            } else if (diff > 0) {
                changeText = `(⬆️ ${diff.toFixed(1)} kg vs ${timeLabel})`;
                color = '#F59E0B'; // Warning color for gain
            } else {
                changeText = `(Sin cambios vs ${timeLabel})`;
            }
        } else {
            changeText = '(Registro inicial)';
        }

        return {
            latestWeight: currentWeight,
            weightChangeText: changeText,
            weightChangeColor: color
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
    
    const infoBlockStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: '120px' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' };
    const valueStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' };
    const alertValueStyle: React.CSSProperties = { ...valueStyle, color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' };
    
    return (
        <>
            <style>{`
                .patient-sticky-header {
                    position: sticky;
                    top: 0;
                    z-index: 900;
                }
                @media (max-width: 960px) {
                    .patient-sticky-header {
                        position: relative !important;
                        padding: 1rem !important;
                        margin-bottom: 1rem !important;
                        z-index: 1;
                        gap: 1rem !important;
                    }
                    .header-bottom-row {
                        display: none !important;
                    }
                    .header-avatar {
                        width: 48px !important;
                        height: 48px !important;
                        font-size: 1.2rem !important;
                    }
                    .header-name {
                        font-size: 1.2rem !important;
                    }
                }
            `}</style>
            
            <div className="patient-sticky-header" style={headerStyle}>
                {/* Left Block: Patient Info */}
                <div style={{ flex: '2 1 300px', display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                    {person.avatar_url ? (
                        <img 
                            src={person.avatar_url}
                            alt="Avatar del paciente"
                            className="header-avatar"
                            style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)'}}
                        />
                    ) : (
                        <div className="header-avatar" style={{
                            width: '64px', height: '64px', borderRadius: '50%', 
                            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface-color) 100%)',
                            color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '1.8rem', flexShrink: 0,
                            border: '1px solid var(--primary-light)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                        }}>
                            {getInitials(person.full_name)}
                        </div>
                    )}
                    <div style={{minWidth: 0, overflow: 'hidden'}}>
                        <h1 className="header-name" style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.full_name}</h1>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '1rem' }}>{calculateAge(person.birth_date)}</p>
                        </div>
                    </div>
                </div>
                
                {/* Right Block: Analytical Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                     <div style={{textAlign: 'right'}}>
                         <span style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600}}>Peso actual</span>
                         <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '0.5rem'}}>
                             <span style={{fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-color)'}}>{latestWeight ? latestWeight : '-'} <span style={{fontSize: '1rem', fontWeight: 500}}>kg</span></span>
                             {latestWeight && (
                                <span style={{fontSize: '0.9rem', color: weightChangeColor, fontWeight: 500}}>{weightChangeText}</span>
                             )}
                         </div>
                     </div>
                </div>
                
                {/* Bottom Row: Alerts (Persistent) */}
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
