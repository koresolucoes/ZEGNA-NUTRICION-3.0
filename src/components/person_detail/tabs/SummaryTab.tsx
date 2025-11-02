import React, { FC } from 'react';
import { Person, ConsultationWithLabs, Allergy, MedicalHistory, DietLog, ExerciseLog, AppointmentWithPerson, PatientServicePlan } from '../../../types';
import { ICONS } from '../../../pages/AuthPage';
import { useClinic } from '../../../contexts/ClinicContext';

// Helper function to calculate age
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

// --- NEW ICONS FOR HEADER ---
const IconAgendar = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg>;
const IconAnotacao = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconPrescrever = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;


interface SummaryTabProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    appointments: AppointmentWithPerson[];
    medications: Medication[];
    servicePlans: PatientServicePlan[];
    isMobile: boolean;
    // Actions
    onRegisterPayment: () => void;
    onAddAppointment: () => void;
    onAddLog: () => void;
    onPrescribe: () => void;
    onViewDetailed: () => void;
}

export const SummaryTab: FC<SummaryTabProps> = ({ 
    person, consultations, allergies, medicalHistory, appointments, medications, servicePlans, isMobile,
    onRegisterPayment, onAddAppointment, onAddLog, onPrescribe, onViewDetailed 
}) => {
    
    const { clinic } = useClinic();
    const latestConsultation = consultations.length > 0 ? consultations[0] : null;
    const initialConsultation = consultations.length > 0 ? consultations[consultations.length - 1] : null;

    const upcomingAppointment = appointments
        .filter(a => new Date(a.start_time) > new Date())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
    
    const currentPlan = servicePlans.find(p => p.id === person.current_plan_id);

    // --- RENDER HELPER COMPONENTS FOR CARDS ---

    const Card: FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
        <div className={`summary-card ${className || ''}`}>
            <h3 className="summary-card-title">{icon}{title}</h3>
            <div className="summary-card-body">{children}</div>
        </div>
    );

    const VitalSign: FC<{ label: string; value: string; status?: 'Normal' | 'Elevado' | 'Atenção'; statusColor?: string }> = ({ label, value, status, statusColor }) => (
        <div className="vital-sign-row">
            <span>{label}</span>
            <div className="vital-sign-value-group">
                <span className="vital-sign-value">{value}</span>
                {status && <span className="vital-sign-status" style={{ color: statusColor }}>{status}</span>}
            </div>
        </div>
    );

    const getVitalStatus = (type: 'bp' | 'glycemia', value: any) => {
        if (type === 'bp' && value) {
            const parts = String(value).split('/');
            if (parts.length === 2) {
                const sys = parseInt(parts[0]);
                const dia = parseInt(parts[1]);
                if (sys >= 140 || dia >= 90) return { text: 'Elevado', color: 'var(--error-color)' };
                if (sys >= 130 || dia >= 85) return { text: 'Atenção', color: '#f59e0b' };
            }
        }
        if (type === 'glycemia' && value) {
            if (value >= 126) return { text: 'Elevado', color: 'var(--error-color)' };
            if (value >= 100) return { text: 'Atenção', color: '#f59e0b' };
        }
        return { text: 'Normal', color: 'var(--accent-color)' };
    };
    
    return (
        <div className="fade-in">
            <style>{`
                .summary-header {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 1rem 0;
                    margin-bottom: 1.5rem;
                }
                .summary-patient-info { display: flex; align-items: center; gap: 1.5rem; }
                .summary-patient-avatar { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); }
                .summary-patient-name { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--text-color); }
                .summary-patient-details { margin: 0.25rem 0 0 0; color: var(--text-light); }
                .summary-actions { display: flex; gap: 0.75rem; }
                .summary-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
                .summary-main-col, .summary-side-col { display: flex; flex-direction: column; gap: 1.5rem; }
                .summary-card { background-color: var(--surface-color); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
                .summary-card-title { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); margin: 0; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
                .summary-card-body { padding: 1.5rem; }
                .critical-card { background-color: var(--error-bg); border-color: var(--error-color); }
                .critical-card .summary-card-title { color: var(--error-color); border-bottom-color: rgba(239, 68, 68, 0.3); }
                .critical-card ul { list-style-position: inside; padding-left: 0; }
                .vital-sign-row { display: flex; justify-content: space-between; align-items: baseline; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
                .vital-sign-row:last-child { border-bottom: none; }
                .vital-sign-value-group { display: flex; flex-direction: column; align-items: flex-end; }
                .vital-sign-value { font-size: 1.5rem; font-weight: 600; }
                .vital-sign-status { font-size: 0.8rem; font-weight: 500; text-transform: uppercase; }
                .key-info-item { padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
                .key-info-item:last-child { border-bottom: none; }
                .key-info-label { font-size: 0.8rem; color: var(--text-light); }
                .key-info-value { font-weight: 500; }
                .progress-card-image { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; }
                .progress-points { display: flex; justify-content: space-between; text-align: center; }
                .medication-item { margin-bottom: 0.5rem; }
                
                @media (max-width: 960px) { .summary-grid { grid-template-columns: 1fr; } }
            `}</style>

            {/* Header */}
            <div className="summary-header">
                <div className="summary-patient-info">
                    <img src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name || '?'}&radius=50`} alt="Avatar" className="summary-patient-avatar" />
                    <div>
                        <h1 className="summary-patient-name">{person.full_name}</h1>
                        <p className="summary-patient-details">
                            {calculateAge(person.birth_date)} • {person.gender === 'male' ? 'Masculino' : 'Feminino'} • ID: {person.folio || 'N/A'}
                        </p>
                    </div>
                </div>
                <div className="summary-actions">
                    <button onClick={onAddAppointment}><IconAgendar /> Agendar Consulta</button>
                    <button onClick={onAddLog} className="button-secondary"><IconAnotacao /> Adicionar Anotação</button>
                    <button onClick={onPrescribe} className="button-secondary"><IconPrescrever /> Prescrever</button>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="summary-grid">
                {/* Main Column */}
                <div className="summary-main-col">
                    <Card title="INFORMAÇÕES CRÍTICAS" icon={<span style={{color: 'var(--error-color)'}}>⚠️</span>} className="critical-card">
                        <h4 style={{marginTop: 0}}>Alertas Importantes</h4>
                        <ul>
                            {allergies.map(a => <li key={a.id}>Alergia a {a.substance}</li>)}
                            {medicalHistory.filter(h => ['Hipertensão Crônica', 'Diabetes Mellitus Tipo 2', 'Risco de Queda Elevado'].includes(h.condition)).map(h => <li key={h.id}>{h.condition}</li>)}
                        </ul>
                         {allergies.length === 0 && medicalHistory.length === 0 && <p>Nenhuma informação crítica registrada.</p>}
                    </Card>

                    <Card title="Sinais Vitais Recentes">
                        <VitalSign label="Pressão Arterial" value={latestConsultation?.ta || 'N/A'} status={getVitalStatus('bp', latestConsultation?.ta).text} statusColor={getVitalStatus('bp', latestConsultation?.ta).color} />
                        <VitalSign label="Frequência Cardíaca" value="82 bpm" status="Normal" statusColor="var(--accent-color)" />
                        <VitalSign label="SpO2" value="97%" status="Normal" statusColor="var(--accent-color)" />
                        <VitalSign label="Glicemia" value={latestConsultation?.lab_results?.[0]?.glucose_mg_dl ? `${latestConsultation.lab_results[0].glucose_mg_dl} mg/dL` : 'N/A'} status={getVitalStatus('glycemia', latestConsultation?.lab_results?.[0]?.glucose_mg_dl).text} statusColor={getVitalStatus('glycemia', latestConsultation?.lab_results?.[0]?.glucose_mg_dl).color} />
                    </Card>

                    <Card title="Diagnósticos Ativos">
                        <ul>
                            {medicalHistory.map(h => <li key={h.id}>{h.condition}</li>)}
                        </ul>
                        {medicalHistory.length === 0 && <p>Nenhum diagnóstico ativo registrado.</p>}
                    </Card>

                    <Card title="Medicamentos em Uso">
                        {medications.map(m => (
                            <div key={m.id} className="medication-item">
                                <p style={{margin: 0, fontWeight: 600}}>{m.name}</p>
                                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>{m.dosage} • {m.frequency}</p>
                            </div>
                        ))}
                        {medications.length === 0 && <p>Nenhum medicamento em uso registrado.</p>}
                    </Card>
                </div>

                {/* Side Column */}
                <div className="summary-side-col">
                    <Card title="Informações Chave">
                         <div className="key-info-item">
                            <p className="key-info-label">Contato de Emergência</p>
                            <p className="key-info-value">{person.emergency_contact_name || 'N/A'} {person.emergency_contact_phone && `(${person.emergency_contact_phone})`}</p>
                        </div>
                        <div className="key-info-item">
                            <p className="key-info-label">Plano de Saúde</p>
                            <p className="key-info-value">{currentPlan?.name || 'N/A'}</p>
                        </div>
                        <div className="key-info-item">
                            <p className="key-info-label">Médico Principal</p>
                            <p className="key-info-value">Dr. Carlos Andrade</p>
                        </div>
                        <div className="key-info-item">
                            <p className="key-info-label">Próxima Consulta</p>
                            <p className="key-info-value">{upcomingAppointment ? new Date(upcomingAppointment.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nenhuma agendada'}</p>
                        </div>
                        <button onClick={onViewDetailed} style={{width: '100%', marginTop: '1rem'}}>Ver Prontuário Completo</button>
                    </Card>

                    <Card title="Progresso da Meta: Perda de Peso">
                        <img src="https://i.imgur.com/6a2z02D.png" alt="Weight loss progress illustration" className="progress-card-image" />
                        <div className="progress-points">
                            <div>
                                <p className="key-info-label">Início</p>
                                <p className="key-info-value">{initialConsultation?.weight_kg || 'N/A'} kg</p>
                            </div>
                             <div>
                                <p className="key-info-label">Atual</p>
                                <p className="key-info-value" style={{color: 'var(--primary-color)', fontSize: '1.2rem'}}>{latestConsultation?.weight_kg || 'N/A'} kg</p>
                            </div>
                             <div>
                                <p className="key-info-label">Meta</p>
                                <p className="key-info-value">75 kg</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
