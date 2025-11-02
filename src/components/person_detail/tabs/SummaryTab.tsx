import React, { FC } from 'react';
import { Person, ConsultationWithLabs, Allergy, MedicalHistory, DietLog, ExerciseLog, AppointmentWithPerson } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import PlanStatusIndicator from '../../shared/PlanStatusIndicator';

interface SummaryTabProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    appointments: AppointmentWithPerson[];
    isMobile: boolean;
    onRegisterPayment: () => void;
}

export const SummaryTab: FC<SummaryTabProps> = ({ person, consultations, allergies, medicalHistory, dietLogs, exerciseLogs, appointments, isMobile, onRegisterPayment }) => {
    
    const latestConsultation = consultations?.[0] || null;

    const upcomingAppointment = appointments
        .filter(a => new Date(a.start_time) > new Date())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

    const Widget: FC<{ title: string; children: React.ReactNode, icon?: React.ReactNode }> = ({ title, children, icon }) => (
        <div className="summary-widget">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                {icon && <span style={{color: 'var(--primary-color)'}}>{icon}</span>}
                <h3 style={{...styles.detailCardTitle, margin: 0, fontSize: '1.1rem'}}>{title}</h3>
            </div>
            <div>
                {children}
            </div>
        </div>
    );
    
    return (
        <div className="fade-in" style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '1.5rem' 
        }}>

            <Widget title="Próxima Cita" icon={ICONS.calendar}>
                {upcomingAppointment ? (
                    <>
                        <p style={{margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '1.1rem'}}>{upcomingAppointment.title}</p>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                            {new Date(upcomingAppointment.start_time).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                    </>
                ) : <p>No hay citas próximas agendadas.</p>}
            </Widget>

            <Widget title="Último Peso Registrado" icon={ICONS.activity}>
                {latestConsultation?.weight_kg ? (
                     <p style={{margin: 0, fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-color)'}}>
                        {latestConsultation.weight_kg} <span style={{fontSize: '1.5rem', color: 'var(--text-light)'}}>kg</span>
                    </p>
                ) : <p>Sin registro de peso.</p>}
            </Widget>

             <Widget title="Estado del Plan" icon={ICONS.check}>
                <PlanStatusIndicator planEndDate={person.subscription_end_date} />
            </Widget>

             <Widget title="Alertas Clínicas" icon={ICONS.briefcase}>
                {allergies.length > 0 || medicalHistory.length > 0 ? (
                    <ul style={{margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {allergies.slice(0, 2).map(a => <li key={a.id} style={{color: 'var(--error-color)'}}>Alergia: {a.substance}</li>)}
                        {medicalHistory.slice(0, 2).map(h => <li key={h.id}>{h.condition}</li>)}
                    </ul>
                ) : <p>No hay alertas clínicas importantes.</p>}
            </Widget>
            
            <div style={{gridColumn: '1 / -1', marginTop: '1rem'}}>
                <div className="section-header">
                     <h2 className="section-title">Acciones Rápidas</h2>
                </div>
                 <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={onRegisterPayment} style={{flex: 1}}>
                        {ICONS.calculator} Registrar Cobro
                    </button>
                 </div>
            </div>

        </div>
    );
};