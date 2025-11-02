import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, DailyCheckin, File as PersonFile, NutritionistProfile, TeamMember, CareTeamMemberProfile, InternalNoteWithAuthor, DietPlanHistoryItem, AppointmentWithPerson, Clinic, PatientServicePlan, PopulatedPartnership, KnowledgeResource } from '../types';

// Import hooks and contexts
import { useClinic } from '../contexts/ClinicContext';

// Import Modals (some might be unused now but kept for potential future re-integration)
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ReportModal from '../components/ReportModal';

// Import placeholder for now
import ConsultationModePage from './ConsultationModePage';

const ICONS: { [key: string]: React.ReactNode } = {
    calendar: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    print: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
    addNote: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    lab: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flask-conical"><path d="M10 2v7.31"/><path d="M14 9.31V2"/><path d="M6.6 15h10.8"/><path d="m12 9.31 5.2-2.3"/><path d="m12 9.31-5.2-2.3"/><path d="M8.2 21h7.6"/><path d="M14 21a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2"/></svg>,
    prescription: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pilcrow-right"><path d="M12 22v-6"/><path d="M16 16h-4"/><path d="M16 12h-4"/><path d="M16 8h-4"/><path d="M16 4h-4"/><path d="M18 22a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/></svg>,
};


interface PersonDetailPageProps { 
    user: User;
    personId: string;
    personType: 'client' | 'member';
    onBack: () => void; 
    isMobile: boolean; 
    nutritionistProfile: NutritionistProfile | null;
    navigate: (page: string, context?: any) => void;
    onStartConsultation: () => void;
    initialConsultationMode?: boolean;
}

const PersonDetailPage: FC<PersonDetailPageProps> = ({ user, personId, onBack, isMobile, nutritionistProfile, navigate }) => {
    const { clinic } = useClinic();
    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data States
    const [consultations, setConsultations] = useState<ConsultationWithLabs[]>([]);
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true); setError(null);
        try {
            const [ personRes, consultRes, appointmentsRes, logsRes, allergiesRes, medicalHistoryRes, medicationsRes, teamMembersRes ] = await Promise.all([
                supabase.from('persons').select('*').eq('id', personId).single(),
                supabase.from('consultations').select('*, lab_results(*)').eq('person_id', personId).order('consultation_date', { ascending: false }),
                supabase.from('appointments').select('*').eq('person_id', personId).order('start_time', { ascending: false }),
                supabase.from('logs').select('*').eq('person_id', personId).order('created_at', { ascending: false }).limit(5),
                supabase.from('allergies_intolerances').select('*').eq('person_id', personId),
                supabase.from('medical_history').select('*').eq('person_id', personId),
                supabase.from('medications').select('*').eq('person_id', personId),
                supabase.from('team_members_with_profiles').select('*').eq('clinic_id', clinic.id)
            ]);
            
            const errors = [personRes.error, consultRes.error, appointmentsRes.error, logsRes.error, allergiesRes.error, medicalHistoryRes.error, medicationsRes.error, teamMembersRes.error];
            const firstError = errors.find(err => err && err.code !== 'PGRST116');
            if (firstError) throw firstError;

            setPerson(personRes.data);
            setConsultations(consultRes.data || []);
            setAppointments(appointmentsRes.data as AppointmentWithPerson[] || []);
            setLogs(logsRes.data || []);
            setAllergies(allergiesRes.data || []);
            setMedicalHistory(medicalHistoryRes.data || []);
            setMedications(medicationsRes.data || []);
            setTeamMembers(teamMembersRes.data || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [personId, clinic]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <div className="fade-in p-8"><p>Cargando perfil del paciente...</p></div>;
    if (error) return <div className="fade-in p-8"><p className="text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</p></div>;
    if (!person) return <div className="fade-in p-8"><p>Paciente no encontrado.</p></div>;

    return <PatientProfileView person={person} consultations={consultations} appointments={appointments} logs={logs} allergies={allergies} medicalHistory={medicalHistory} medications={medications} teamMembers={teamMembers} onBack={onBack} isMobile={isMobile} navigate={navigate} />;
};


// --- UI Components ---

const PatientProfileView: FC<{
    person: Person;
    consultations: ConsultationWithLabs[];
    appointments: AppointmentWithPerson[];
    logs: Log[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    teamMembers: TeamMember[];
    onBack: () => void;
    isMobile: boolean;
    navigate: (page: string, context?: any) => void;
}> = ({ person, consultations, appointments, logs, allergies, medicalHistory, medications, teamMembers, onBack, isMobile, navigate }) => {
    
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    
    const latestConsultation = useMemo(() => consultations?.[0] || null, [consultations]);
    const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.user_id, m.full_name])), [teamMembers]);
    
    const calculateAge = (birthDate: string | null | undefined): number | null => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };
    
    const age = calculateAge(person.birth_date);
    
    // --- Data for Cards ---
    const primaryDiagnosis = medicalHistory.find(h => h.condition.toLowerCase().includes('diabetes'))?.condition || 'N/A';
    const responsibleProfessional = latestConsultation?.nutritionist_id ? memberMap.get(latestConsultation.nutritionist_id) : 'N/A';
    const emergencyContact = person.emergency_contact_name;
    const emergencyPhone = person.emergency_contact_phone;

    const vitals = {
        bp: latestConsultation?.ta || 'N/A',
        hr: '78', // Hardcoded as per design
        glucose: latestConsultation?.lab_results?.[0]?.glucose_mg_dl || 'N/A',
        imc: latestConsultation?.imc?.toFixed(1) || 'N/A',
    };
    
    const hba1cData = useMemo(() => 
        consultations
            .map(c => ({ date: new Date(c.consultation_date), value: c.lab_results?.[0]?.hba1c }))
            .filter(d => d.value != null)
            .sort((a,b) => a.date.getTime() - b.date.getTime())
    , [consultations]);

    const upcomingAppointments = useMemo(() =>
        appointments
            .filter(a => new Date(a.start_time) > new Date())
            .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 2)
    , [appointments]);
    
    const activeMedications = useMemo(() => medications.slice(0,3), [medications]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {isReportModalOpen && <ReportModal person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} onClose={() => setReportModalOpen(false)} isMobile={isMobile} clinic={null} dietLogs={[]} exerciseLogs={[]} lifestyleHabits={null} medications={medications} nutritionistProfile={null} />}
            
            {/* Header */}
            <header className="mb-8">
                <button onClick={onBack} className="button-secondary mb-4">&larr; Voltar para a lista</button>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <img src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name}`} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-800">{person.full_name}{age && `, ${age}`}</h1>
                        <p className="text-gray-500">ID do Paciente: {person.folio || 'N/A'} &bull; {person.gender === 'female' ? 'Feminino' : 'Masculino'}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {allergies.slice(0,1).map(allergy => <AlertBadge key={allergy.id} type="ALERTA" text={allergy.substance} />)}
                           {medicalHistory.filter(h => h.condition.toLowerCase().includes('hipertens')).slice(0,1).map(h => <AlertBadge key={h.id} type="ALTO RISCO" text={h.condition} color="orange" />)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <button className="button-secondary p-2 h-10 w-10">{ICONS.calendar}</button>
                        <button onClick={() => setReportModalOpen(true)} className="button-secondary p-2 h-10 w-10">{ICONS.print}</button>
                        <button onClick={() => navigate('log-form', { personId: person.id, personType: 'client' })}>+ Adicionar Nota</button>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card title="Informações Chave">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <InfoItem label="Diagnóstico Primário" value={primaryDiagnosis} />
                            <InfoItem label="Médico Responsável" value={responsibleProfessional} />
                            <InfoItem label="Contato de Emergência" value={emergencyContact} />
                            <InfoItem label="Telefone" value={emergencyPhone} />
                        </div>
                    </Card>

                    <Card title="Sinais Vitais e Progresso (HbA1c)">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <VitalSign name="Pressão Arterial" value={vitals.bp} unit="mmHg" status="Levemente alto" statusColor="orange" />
                            <VitalSign name="Frequência Cardíaca" value={vitals.hr} unit="bpm" status="Normal" statusColor="green" />
                            <VitalSign name="Glicemia" value={vitals.glucose} unit="mg/dL" status="Elevado" statusColor="red" />
                            <VitalSign name="IMC" value={vitals.imc} unit="" status="Sobrepeso" statusColor="orange" />
                        </div>
                    </Card>

                    <Card title="Progressão de HbA1c">
                       <LineChart data={hba1cData.map(d => ({ x: d.date, y: d.value! }))} height={250} />
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-col gap-6">
                    <Card title="Próximas Consultas">
                        <div className="flex flex-col gap-4">
                            {upcomingAppointments.length > 0 ? upcomingAppointments.map(appt => (
                                <AppointmentItem key={appt.id} date={new Date(appt.start_time)} title={appt.title} doctor={teamMembers.find(m => m.user_id === appt.user_id)?.full_name || 'N/A'} />
                            )) : <p className="text-gray-500 text-sm">Nenhuma consulta futura agendada.</p>}
                        </div>
                        <a href="#" className="text-blue-600 font-semibold text-sm mt-4 block text-center">Ver Todos</a>
                    </Card>

                    <Card title="Medicamentos Ativos">
                         <div className="flex flex-col gap-3">
                            {activeMedications.map(med => <MedicationItem key={med.id} name={med.name} dosage={med.dosage} />)}
                        </div>
                    </Card>
                    
                     <Card title="Atividade Recente">
                        <div className="flex flex-col gap-3">
                            {logs.map(log => <ActivityItem key={log.id} log={log} />)}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};


const Card: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{backgroundColor: 'var(--surface-color)'}} className="rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 p-4 border-b border-gray-200">{title}</h2>
        <div className="p-4">{children}</div>
    </div>
);

const AlertBadge: FC<{ type: string, text: string, color?: 'red' | 'orange' }> = ({ type, text, color = 'red' }) => {
    const colors = {
        red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-600/20' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-600/20' }
    };
    return <span className={`inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium ${colors[color].bg} ${colors[color].text} ring-1 ring-inset ${colors[color].ring}`}>
        <svg className="h-1.5 w-1.5 fill-current" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" /></svg>
        {type}: {text}
    </span>
};

const InfoItem: FC<{ label: string, value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800">{value || '-'}</p>
    </div>
);

const VitalSign: FC<{ name: string; value: string | number; unit: string; status: string; statusColor: 'green' | 'orange' | 'red' }> = ({ name, value, unit, status, statusColor }) => {
    const colors = { green: 'text-green-600', orange: 'text-orange-500', red: 'text-red-600' };
    return <div>
        <p className="text-xs text-gray-500 uppercase font-semibold">{name}</p>
        <p className="text-2xl font-bold text-gray-800">{value} <span className="text-lg font-medium text-gray-500">{unit}</span></p>
        <p className={`text-sm font-medium ${colors[statusColor]}`}>{status}</p>
    </div>
};

const AppointmentItem: FC<{ date: Date; title: string; doctor: string }> = ({ date, title, doctor }) => (
    <div className="flex gap-4 items-center">
        <div className="flex-shrink-0 text-center bg-blue-100 text-blue-700 font-bold p-2 rounded-lg w-16">
            <p className="text-xl leading-none">{date.getDate()}</p>
            <p className="text-xs uppercase">{date.toLocaleString('pt-BR', { month: 'short' })}</p>
        </div>
        <div>
            <p className="font-semibold text-gray-800">{title}</p>
            <p className="text-sm text-gray-500">{doctor} &bull; {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
    </div>
);

const MedicationItem: FC<{ name: string, dosage: string | null }> = ({ name, dosage }) => (
    <div>
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{dosage}</p>
    </div>
);

const ActivityItem: FC<{ log: Log }> = ({ log }) => {
    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `${Math.floor(interval)} anos atrás`;
        interval = seconds / 2592000;
        if (interval > 1) return `${Math.floor(interval)} meses atrás`;
        interval = seconds / 86400;
        if (interval > 1) return `${Math.floor(interval)} dias atrás`;
        interval = seconds / 3600;
        if (interval > 1) return `${Math.floor(interval)} horas atrás`;
        interval = seconds / 60;
        if (interval > 1) return `${Math.floor(interval)} minutos atrás`;
        return `${Math.floor(seconds)} segundos atrás`;
    }
    
    const icon = log.log_type.includes('laboratório') ? ICONS.lab : log.log_type.includes('prescrição') ? ICONS.prescription : ICONS.addNote;

    return (
        <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-800">{log.description}</p>
                <p className="text-xs text-gray-400">{timeAgo(log.created_at)}</p>
            </div>
        </div>
    );
};

const LineChart: FC<{ data: {x: Date, y: number}[], height: number }> = ({ data, height }) => {
    if (data.length < 2) return <div style={{height}} className="flex items-center justify-center text-gray-500">Dados insuficientes para o gráfico.</div>;

    const width = 500;
    const padding = { top: 20, right: 20, bottom: 30, left: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.y);
    const dates = data.map(d => d.x.getTime());
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const minX = Math.min(...dates);
    const maxX = Math.max(...dates);

    const xScale = (date: Date) => (date.getTime() - minX) / (maxX - minX) * chartWidth;
    const yScale = (value: number) => chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;

    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.x)} ${yScale(d.y)}`).join(' ');

    return <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Y-axis */}
            <text x={-5} y={yScale(maxY)} dy="0.3em" textAnchor="end" className="text-xs fill-current text-gray-500">{maxY.toFixed(1)}</text>
            <text x={-5} y={yScale(minY)} dy="0.3em" textAnchor="end" className="text-xs fill-current text-gray-500">{minY.toFixed(1)}</text>
            {/* X-axis */}
            <text x={xScale(data[0].x)} y={chartHeight + 20} textAnchor="start" className="text-xs fill-current text-gray-500">{data[0].x.toLocaleDateString('pt-BR')}</text>
            <text x={xScale(data[data.length - 1].x)} y={chartHeight + 20} textAnchor="end" className="text-xs fill-current text-gray-500">{data[data.length-1].x.toLocaleDateString('pt-BR')}</text>
            
            <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />
             {data.map((d, i) => <circle key={i} cx={xScale(d.x)} cy={yScale(d.y)} r="3" fill="#3b82f6" />)}
        </g>
    </svg>
};

export default PersonDetailPage;
