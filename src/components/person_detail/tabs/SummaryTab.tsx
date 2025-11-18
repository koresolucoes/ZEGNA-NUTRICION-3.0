import React, { FC } from 'react';
import { Person, ConsultationWithLabs, Allergy, MedicalHistory, DietLog, ExerciseLog, AppointmentWithPerson } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import ProgressChart from '../../shared/ProgressChart';

interface SummaryTabProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    appointments: AppointmentWithPerson[];
    isMobile: boolean;
}

export const SummaryTab: FC<SummaryTabProps> = ({ person, consultations, allergies, medicalHistory, dietLogs, exerciseLogs, appointments, isMobile }) => {
    
    const latestConsultation = consultations?.[0] || null;
    const latestDiet = dietLogs?.[0] || null;
    const latestExercise = exerciseLogs?.[0] || null;

    const upcomingAppointment = appointments
        .filter(a => new Date(a.start_time) > new Date())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

    const sortedConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
    const weightData = sortedConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
    const imcData = sortedConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));


    const Widget: FC<{ title: string; children: React.ReactNode, icon?: React.ReactNode }> = ({ title, children, icon }) => (
        <div style={styles.detailCard}>
            <div style={{...styles.detailCardHeader, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                {icon && <span style={{color: 'var(--primary-color)'}}>{icon}</span>}
                <h3 style={{...styles.detailCardTitle, margin: 0}}>{title}</h3>
            </div>
            <div style={styles.detailCardBody}>
                {children}
            </div>
        </div>
    );
    
    return (
        <div className="fade-in" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '1.5rem' 
        }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                <ProgressChart title="Evolución del Peso" data={weightData} unit="kg" />
                <ProgressChart title="Evolución del IMC" data={imcData} unit="pts" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <Widget title="Próxima Cita" icon={ICONS.calendar}>
                    {upcomingAppointment ? (
                        <>
                            <p style={{margin: '0 0 0.25rem 0', fontWeight: 600}}>{upcomingAppointment.title}</p>
                            <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                                {new Date(upcomingAppointment.start_time).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                            </p>
                        </>
                    ) : <p>No hay citas próximas agendadas.</p>}
                </Widget>

                <Widget title="Última Consulta" icon={ICONS.clinic}>
                    {latestConsultation ? (
                        <>
                            <p style={{margin: '0 0 1rem 0', fontWeight: 500, color: 'var(--text-light)'}}>
                                {new Date(latestConsultation.consultation_date).toLocaleDateString('es-MX', {dateStyle: 'long', timeZone: 'UTC'})}
                            </p>
                            <div style={{display: 'flex', justifyContent: 'space-around', textAlign: 'center'}}>
                                <div><p style={styles.detailGroupTitle}>Peso</p><p style={styles.clinicalDataValue}>{latestConsultation.weight_kg} kg</p></div>
                                <div><p style={styles.detailGroupTitle}>IMC</p><p style={styles.clinicalDataValue}>{latestConsultation.imc}</p></div>
                                <div><p style={styles.detailGroupTitle}>TA</p><p style={styles.clinicalDataValue}>{latestConsultation.ta || '-'}</p></div>
                            </div>
                        </>
                    ) : <p>No hay consultas registradas.</p>}
                </Widget>

                 <Widget title="Alertas Clínicas" icon={ICONS.briefcase}>
                    {allergies.length > 0 || medicalHistory.length > 0 ? (
                        <ul style={{margin: 0, paddingLeft: '1.25rem'}}>
                            {allergies.slice(0, 2).map(a => <li key={a.id} style={{color: 'var(--error-color)'}}>Alergia: {a.substance}</li>)}
                            {medicalHistory.slice(0, 2).map(h => <li key={h.id}>{h.condition}</li>)}
                        </ul>
                    ) : <p>No hay alertas clínicas importantes.</p>}
                </Widget>

                <Widget title="Plan de Alimentación Actual" icon={ICONS.book}>
                    {latestDiet ? (
                        <>
                            <p style={{margin: '0 0 1rem 0', fontWeight: 500, color: 'var(--text-light)'}}>
                                Día: {new Date(latestDiet.log_date).toLocaleDateString('es-MX', {weekday: 'long', timeZone: 'UTC'})}
                            </p>
                            <p style={{margin: 0, fontSize: '0.9rem'}}><strong>Comida:</strong> {latestDiet.comida || 'N/A'}</p>
                        </>
                    ) : <p>No hay un plan de alimentación activo.</p>}
                </Widget>

                 <Widget title="Rutina de Ejercicio Actual" icon={ICONS.activity || ICONS.home /* Placeholder */}>
                    {latestExercise ? (
                        <>
                             <p style={{margin: '0 0 1rem 0', fontWeight: 500, color: 'var(--text-light)'}}>
                                Día: {new Date(latestExercise.log_date).toLocaleDateString('es-MX', {weekday: 'long', timeZone: 'UTC'})}
                            </p>
                            <p style={{margin: 0, fontSize: '0.9rem'}}><strong>Enfoque:</strong> {latestExercise.enfoque || 'General'}</p>
                        </>
                    ) : <p>No hay una rutina de ejercicio activa.</p>}
                </Widget>
            </div>
        </div>
    );
};
