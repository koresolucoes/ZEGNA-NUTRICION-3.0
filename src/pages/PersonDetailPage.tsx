import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { 
    Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, 
    Medication, LifestyleHabits, InternalNoteWithAuthor, DietPlanHistoryItem, 
    AppointmentWithPerson, Clinic, PatientServicePlan, PopulatedPartnership, 
    CareTeamMemberProfile, DailyCheckin, File as PersonFile, TeamMember, KnowledgeResource,
    CareTeam
} from '../types';
import { useClinic } from '../contexts/ClinicContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import PatientStickyHeader from '../components/shared/PatientStickyHeader';

// Tabs
import { SummaryTab } from '../components/person_detail/tabs/SummaryTab';
import { ClinicalHistoryTab } from '../components/person_detail/tabs/ClinicalHistoryTab';
import { PlansTab } from '../components/person_detail/tabs/PlansTab';
import { CalculatedPlansTab } from '../components/person_detail/tabs/CalculatedPlansTab';
import { LogTab } from '../components/person_detail/tabs/LogTab';
import { FilesTab } from '../components/person_detail/tabs/FilesTab';
import { DailyTrackingTab } from '../components/person_detail/tabs/DailyTrackingTab';
import { InfoTab } from '../components/person_detail/tabs/InfoTab';
import { AppointmentsTab } from '../components/person_detail/tabs/AppointmentsTab';
import { TeamTab } from '../components/person_detail/tabs/TeamTab';

// Modals & Forms
import AppointmentFormModal from '../components/forms/AppointmentFormModal';
import DietLogFormModal from '../components/forms/DietLogFormModal';
import ExerciseLogFormModal from '../components/forms/ExerciseLogFormModal';
import AllergyFormModal from '../components/forms/AllergyFormModal';
import MedicalHistoryFormModal from '../components/forms/MedicalHistoryFormModal';
import MedicationFormModal from '../components/forms/MedicationFormModal';
import LifestyleFormModal from '../components/forms/LifestyleFormModal';
import { FileUploadModal } from '../components/forms/FileUploadModal';
import PaymentFormModal from '../components/person_detail/PaymentFormModal';
import PlanAssignmentModal from '../components/person_detail/PlanAssignmentModal';
import ReferPersonModal from '../components/person_detail/ReferPersonModal';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ReportModal from '../components/ReportModal';
import ConsultationDetailModal from '../components/modals/ConsultationDetailModal';
import LogDetailModal from '../components/modals/LogDetailModal';
import DietLogDetailModal from '../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../components/modals/ExerciseLogDetailModal';
import ConsultingRoomModal from '../components/shared/ConsultingRoomModal';
import MealPlanGenerator from '../components/MealPlanGenerator';
import ExercisePlanGenerator from '../components/ExercisePlanGenerator';
import ConsultationModePage from './ConsultationModePage';
import { createPortal } from 'react-dom';

const modalRoot = document.getElementById('modal-root');

// Internal Component for Invitation Modal
const PatientInvitationModal: FC<{ person: Person; clinic: Clinic; onClose: () => void; }> = ({ person, clinic, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch('/api/invite-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_id: person.id, email }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSuccess(result.message);
            setTimeout(onClose, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (!modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '400px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Invitar al Portal</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <p style={{marginTop: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                        Envía una invitación a <strong>{person.full_name}</strong> para que acceda a su portal de paciente.
                    </p>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <label htmlFor="invite-email">Correo Electrónico</label>
                    <input 
                        id="invite-email" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        placeholder="ejemplo@correo.com"
                        style={styles.input}
                    />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading || !!success} className="button-primary">
                        {loading ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

interface PersonDetailPageProps {
    user: User;
    personId: string;
    personType: 'client' | 'member';
    onBack: () => void;
    isMobile: boolean;
    nutritionistProfile: any;
    navigate: (page: string, context?: any) => void;
    onStartConsultation: () => void;
    initialConsultationMode?: boolean;
}

const PersonDetailPage: FC<PersonDetailPageProps> = ({ user, personId, personType, onBack, isMobile, nutritionistProfile, navigate, onStartConsultation, initialConsultationMode = false }) => {
    const { clinic, role, subscription } = useClinic();
    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data States
    const [activePartners, setActivePartners] = useState<PopulatedPartnership[]>([]);
    const [consultations, setConsultations] = useState<ConsultationWithLabs[]>([]);
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [allDietLogs, setAllDietLogs] = useState<DietLog[]>([]);
    const [allExerciseLogs, setAllExerciseLogs] = useState<ExerciseLog[]>([]);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [lifestyleHabits, setLifestyleHabits] = useState<LifestyleHabits | null>(null);
    const [dailyCheckins, setDailyCheckins] = useState<DailyCheckin[]>([]);
    const [files, setFiles] = useState<PersonFile[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [careTeam, setCareTeam] = useState<CareTeamMemberProfile[]>([]);
    const [internalNotes, setInternalNotes] = useState<InternalNoteWithAuthor[]>([]);
    const [planHistory, setPlanHistory] = useState<DietPlanHistoryItem[]>([]);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);
    
    // UI States
    const [activeTab, setActiveTab] = useState('resumen');
    const [activeSubTab, setActiveSubTab] = useState('allergies');
    const [isConsultationMode, setConsultationMode] = useState(initialConsultationMode);
    const [isUploadingConsent, setIsUploadingConsent] = useState(false);
    
    // Modal States
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentWithPerson | null>(null);
    const [isMealPlanModalOpen, setMealPlanModalOpen] = useState(false);
    const [isExercisePlanModalOpen, setExercisePlanModalOpen] = useState(false);
    const [isAllergyModalOpen, setAllergyModalOpen] = useState(false);
    const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);
    const [isMedicalHistoryModalOpen, setMedicalHistoryModalOpen] = useState(false);
    const [editingMedicalHistory, setEditingMedicalHistory] = useState<MedicalHistory | null>(null);
    const [isMedicationModalOpen, setMedicationModalOpen] = useState(false);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [isLifestyleModalOpen, setLifestyleModalOpen] = useState(false);
    const [editingDietLog, setEditingDietLog] = useState<DietLog | null>(null);
    const [editingExerciseLog, setEditingExerciseLog] = useState<ExerciseLog | null>(null);
    const [isCreatingManualLog, setIsCreatingManualLog] = useState<'diet' | 'exercise' | null>(null);
    const [isFileUploadModalOpen, setFileUploadModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{ isOpen: boolean; action: any; idToDelete: string | null; text: string | null; fileToDeletePath?: string | null; }>({ isOpen: false, action: null, idToDelete: null, text: null, fileToDeletePath: null });
    const [viewingConsultation, setViewingConsultation] = useState<ConsultationWithLabs | null>(null);
    const [viewingLog, setViewingLog] = useState<Log | null>(null);
    const [viewingDietLog, setViewingDietLog] = useState<DietLog | null>(null);
    const [viewingExerciseLog, setViewingExerciseLog] = useState<ExerciseLog | null>(null);
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [appointmentToCall, setAppointmentToCall] = useState<AppointmentWithPerson | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPlanModalOpen, setPlanModalOpen] = useState(false);

    const hasAiFeature = useMemo(() => {
        return subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false;
    }, [subscription]);

    const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.user_id, m])), [teamMembers]);
    
    const handleTabClick = (tab: string, defaultSubTab: string = '') => {
        setActiveTab(tab);
        if(defaultSubTab) setActiveSubTab(defaultSubTab);
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!clinic) return;
        if (!silent) setLoading(true); 
        setError(null);
        try {
             const [
                personRes, consultRes, logsRes, dietRes, exerciseRes,
                allergiesRes, medicalHistoryRes, medicationsRes, lifestyleRes, checkinsRes, filesRes,
                teamMembersRes, careTeamRes, internalNotesRes, planHistoryRes, appointmentsRes, plansRes,
                personsRes, partnersRes, resourcesRes
            ] = await Promise.all([
                supabase.from('persons').select('*').eq('id', personId).single(),
                supabase.from('consultations').select('*, lab_results(*)').eq('person_id', personId).order('consultation_date', { ascending: false }),
                supabase.from('logs').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('diet_logs').select('*').eq('person_id', personId).order('log_date', { ascending: false }),
                supabase.from('exercise_logs').select('*').eq('person_id', personId).order('log_date', { ascending: false }),
                supabase.from('allergies_intolerances').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('medical_history').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('medications').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('lifestyle_habits').select('*').eq('person_id', personId).single(),
                supabase.from('daily_checkins').select('*').eq('person_id', personId).order('checkin_date', { ascending: false }),
                supabase.from('files').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('team_members_with_profiles').select('*').eq('clinic_id', clinic.id),
                supabase.from('care_team').select('*').eq('person_id', personId),
                supabase.from('internal_notes').select('*, team_members_with_profiles!internal_notes_user_id_fkey(*)').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('diet_plan_history').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('person_id', personId).order('start_time', { ascending: false }),
                supabase.from('patient_service_plans').select('*').eq('clinic_id', clinic.id),
                supabase.from('persons').select('*').eq('clinic_id', clinic.id),
                supabase.from('clinic_ally_partnerships').select('*, allies(*)').eq('clinic_id', clinic.id).eq('status', 'active'),
                supabase.from('knowledge_base_resources').select('*').eq('clinic_id', clinic.id).eq('type', 'Receta')
            ]);
            
            if (personRes.error) throw personRes.error;

            setPerson(personRes.data);
            setConsultations(consultRes.data || []);
            setLogs(logsRes.data || []);
            setAllDietLogs(dietRes.data || []);
            setAllExerciseLogs(exerciseRes.data || []);
            setAllergies(allergiesRes.data || []);
            setMedicalHistory(medicalHistoryRes.data || []);
            setMedications(medicationsRes.data || []);
            setLifestyleHabits(lifestyleRes.data || null);
            setDailyCheckins(checkinsRes.data || []);
            setFiles(filesRes.data || []);
            setPlanHistory(planHistoryRes.data || []);
            setAppointments(appointmentsRes.data as AppointmentWithPerson[] || []);
            setServicePlans(plansRes.data || []);
            setPersons(personsRes.data || []);
            setActivePartners(partnersRes.data as PopulatedPartnership[] || []);
            setKnowledgeResources(resourcesRes.data || []);
            
            const teamMembersData = teamMembersRes.data || [];
            setTeamMembers(teamMembersData);
            
            // Populate Care Team manually since join might be complex
            const careTeamRaw = careTeamRes.data || [];
            const populatedCareTeam = careTeamRaw.map((member: any) => ({
                ...member,
                team_members_with_profiles: teamMembersData.find((tm: any) => tm.user_id === member.user_id) || null
            }));
            setCareTeam(populatedCareTeam);
            
            // Internal Notes are populated via query join now, but let's double check typing
            setInternalNotes((internalNotesRes.data as any) || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [personId, clinic]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Handlers
    const handlePlanSaved = () => { setMealPlanModalOpen(false); setExercisePlanModalOpen(false); setEditingDietLog(null); setEditingExerciseLog(null); setIsCreatingManualLog(null); fetchData(); }
    const handleClinicalHistorySave = () => { setAllergyModalOpen(false); setEditingAllergy(null); setMedicalHistoryModalOpen(false); setEditingMedicalHistory(null); setMedicationModalOpen(false); setEditingMedication(null); setLifestyleModalOpen(false); fetchData(); }
    const handleFileUploadSuccess = () => { setFileUploadModalOpen(false); fetchData(); }
    const openModal = (action: any, id: string, text: string, fileToDeletePath?: string) => setModalState({ isOpen: true, action, idToDelete: id, text, fileToDeletePath });
    const closeModal = () => setModalState({ isOpen: false, action: null, idToDelete: null, text: null, fileToDeletePath: null });
    
    const handleOpenClinicalHistoryModal = (type: 'allergy' | 'medical' | 'medication', item: any | null) => {
        if (type === 'allergy') { setEditingAllergy(item); setAllergyModalOpen(true); }
        if (type === 'medical') { setEditingMedicalHistory(item); setMedicalHistoryModalOpen(true); }
        if (type === 'medication') { setEditingMedication(item); setMedicationModalOpen(true); }
    };
    
    const checkedInAppointmentForToday = appointments.find(a => a.status === 'checked-in' && new Date(a.start_time).toDateString() === new Date().toDateString());
    
    const handleCallPatient = () => { if (checkedInAppointmentForToday) { setAppointmentToCall(checkedInAppointmentForToday); setIsRoomModalOpen(true); } };
    const handleConfirmRoom = async (room: string) => { if (appointmentToCall) { await supabase.from('appointments').update({ status: 'called', consulting_room: room }).eq('id', appointmentToCall.id); setIsRoomModalOpen(false); setAppointmentToCall(null); fetchData(true); } };
    
    const handleSaveAppointment = async (formData: any) => { fetchData(); setIsAppointmentModalOpen(false); };
    const handleDeleteAppointment = async (id: string) => { await supabase.from('appointments').delete().eq('id', id); fetchData(); setIsAppointmentModalOpen(false); };
    
    const handleRegisterConsent = async () => { if (person) await supabase.from('persons').update({ consent_given_at: new Date().toISOString() }).eq('id', person.id); fetchData(); };
    const handleRevokeConsent = () => { if (person) openModal('deletePerson', person.id, 'Revocar consentimiento y eliminar paciente'); };
    const handleExportData = () => { /* Export logic to be implemented based on requirements */ };
    
    const handleConsentFileUpload = async (file: File) => {
        setIsUploadingConsent(true);
        try {
             const fileExt = file.name.split('.').pop();
             const filePath = `${personId}/consent/${Date.now()}.${fileExt}`;
             const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file);
             if (uploadError) throw uploadError;
             const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath);
             await supabase.from('persons').update({ consent_file_url: urlData.publicUrl, consent_given_at: new Date().toISOString() }).eq('id', personId);
             fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al subir archivo de consentimiento.");
        } finally {
            setIsUploadingConsent(false);
        }
    };
    
    const handleFinishConsultation = () => { setConsultationMode(false); fetchData(); };
    
    const handleConfirm = async () => {
        if (!modalState.action || !modalState.idToDelete) return;
        try {
            if (modalState.action === 'deleteDietLog') await supabase.from('diet_logs').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteExerciseLog') await supabase.from('exercise_logs').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteAllergy') await supabase.from('allergies_intolerances').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteMedicalHistory') await supabase.from('medical_history').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteMedication') await supabase.from('medications').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteConsultation') await supabase.from('consultations').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteLog') await supabase.from('logs').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deletePlanHistory') await supabase.from('diet_plan_history').delete().eq('id', modalState.idToDelete);
            else if (modalState.action === 'deleteConsentFile') {
                 // Clear DB field first
                 await supabase.from('persons').update({ consent_file_url: null }).eq('id', personId);
                 // Try to delete from storage if path provided
                 if (modalState.fileToDeletePath) await supabase.storage.from('files').remove([modalState.fileToDeletePath]);
            }
            else if (modalState.action === 'deleteFile') {
                 if (modalState.fileToDeletePath) await supabase.storage.from('files').remove([modalState.fileToDeletePath]);
                 await supabase.from('files').delete().eq('id', modalState.idToDelete);
            }
        } catch (e) {
            console.error(e);
        } finally {
            closeModal();
            fetchData();
        }
    };


    if (loading) return <div className="fade-in"><SkeletonLoader type="detail" count={4} /></div>;
    if (error) return <div className="fade-in"><p style={styles.error}>Error: {error}</p></div>;
    if (!person || !clinic) return <div className="fade-in"><p>Persona no encontrada.</p></div>;

    // --- WIDGETS ---
    const QuickActionsWidget = () => (
        <div style={{...styles.detailCard, backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
            <div style={{padding: '1.25rem', borderBottom: '1px solid var(--border-color)'}}>
                <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)'}}>Acciones Rápidas</h3>
            </div>
            <div style={{padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                <button 
                    onClick={() => { onStartConsultation(); setConsultationMode(true); }}
                    className="button-primary"
                    style={{width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, background: '#10B981', border: 'none'}}
                >
                    {ICONS.activity} Iniciar Consulta
                </button>
                 <button onClick={() => setIsAppointmentModalOpen(true)} className="button-secondary" style={{width: '100%', fontSize: '0.85rem', justifyContent: 'center'}}>
                    {ICONS.calendar} Cita
                </button>
                 <button onClick={() => setIsPaymentModalOpen(true)} className="button-secondary" style={{width: '100%', fontSize: '0.85rem', justifyContent: 'center'}}>
                    {ICONS.dollar} Cobrar
                </button>
                 <button onClick={() => setIsReferralModalOpen(true)} className="button-secondary" style={{width: '100%', fontSize: '0.85rem', justifyContent: 'center'}}>
                    {ICONS.send} Referir Paciente
                </button>
                {checkedInAppointmentForToday && (
                    <button onClick={handleCallPatient} style={{width: '100%', padding: '0.8rem', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700}}>
                        {ICONS.bell} Llamar a Sala
                    </button>
                )}
                 {!person.user_id && personType === 'client' && (
                    <button onClick={() => setIsInvitationModalOpen(true)} className="button-secondary" style={{width: '100%', fontSize: '0.85rem', justifyContent: 'center', marginTop: '0.5rem', color: 'var(--primary-color)', borderColor: 'var(--primary-color)'}}>
                        {ICONS.send} Invitar al Portal
                    </button>
                )}
            </div>
        </div>
    );

    const MacroDistributionWidget = () => {
         const currentPlan = planHistory.length > 0 ? planHistory[0] : null;
        if (!currentPlan || !currentPlan.totals) {
            return (
                <div style={{...styles.detailCard, backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                    <div style={{padding: '1.25rem', borderBottom: '1px solid var(--border-color)'}}>
                        <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)'}}>Distribución de Dieta</h3>
                    </div>
                     <div style={{padding: '1.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem'}}>
                        No hay plan calculado.
                    </div>
                </div>
            );
        }
        const totals = currentPlan.totals;
        const totalGrams = totals.protein_g + totals.lipid_g + totals.carb_g;
        const pPercent = totalGrams ? (totals.protein_g / totalGrams) * 100 : 0;
        const lPercent = totalGrams ? (totals.lipid_g / totalGrams) * 100 : 0;
        const cPercent = totalGrams ? (totals.carb_g / totalGrams) * 100 : 0;
        return (
            <div style={{...styles.detailCard, backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                <div style={{padding: '1.25rem', borderBottom: '1px solid var(--border-color)'}}>
                    <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)'}}>Distribución de Dieta</h3>
                </div>
                <div style={{padding: '1.25rem'}}>
                    <div style={{display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem'}}>
                        <div style={{width: `${pPercent}%`, backgroundColor: '#EC4899'}}></div>
                        <div style={{width: `${lPercent}%`, backgroundColor: '#F59E0B'}}></div>
                        <div style={{width: `${cPercent}%`, backgroundColor: '#3B82F6'}}></div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor: '#EC4899'}}></div> Proteína</span>
                            <span style={{fontWeight: 600}}>{totals.protein_g.toFixed(0)}g</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                             <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor: '#F59E0B'}}></div> Lípidos</span>
                             <span style={{fontWeight: 600}}>{totals.lipid_g.toFixed(0)}g</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                             <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor: '#3B82F6'}}></div> Carbohidratos</span>
                             <span style={{fontWeight: 600}}>{totals.carb_g.toFixed(0)}g</span>
                        </div>
                        <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700}}>
                            <span>Total Kcal</span>
                            <span>{totals.kcal.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const NextAppointmentWidget = () => {
        const upcomingAppointment = appointments
            .filter(a => new Date(a.start_time) > new Date() && a.status === 'scheduled')
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
            
        return (
            <div style={{...styles.detailCard, backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                <div style={{padding: '1.25rem', borderBottom: '1px solid var(--border-color)'}}>
                     <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)'}}>Próxima Cita</h3>
                </div>
                <div style={{padding: '1.25rem'}}>
                    {upcomingAppointment ? (
                        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                            <div style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', 
                                borderRadius: '12px', padding: '0.5rem 1rem', textAlign: 'center',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <span style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase'}}>{new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {month: 'short'}).toUpperCase()}</span>
                                <span style={{display: 'block', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1}}>{new Date(upcomingAppointment.start_time).getDate()}</span>
                            </div>
                            <div>
                                <p style={{margin: 0, fontWeight: 600, fontSize: '0.95rem'}}>{upcomingAppointment.title}</p>
                                <p style={{margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                    {new Date(upcomingAppointment.start_time).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic'}}>No hay citas programadas.</p>
                    )}
                </div>
            </div>
        );
    };
    
    // Private Notes Widget
    const PrivateNotesWidget = () => {
        const [note, setNote] = useState(person?.notes || '');
        const [isSaving, setIsSaving] = useState(false);
        const [saved, setSaved] = useState(false);

        const handleSave = async () => {
            if (!person || note === person.notes) return;
            
            setIsSaving(true);
            try {
                const { error } = await supabase
                    .from('persons')
                    .update({ notes: note })
                    .eq('id', person.id);
                
                if (error) throw error;
                
                setSaved(true);
                // Optimistic update
                setPerson(prev => prev ? { ...prev, notes: note } : null);
                
                setTimeout(() => setSaved(false), 2000);
            } catch (err) {
                console.error("Error saving note:", err);
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <div style={{
                backgroundColor: '#FEF08A', 
                borderRadius: '4px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                border: '1px solid #FDE047', 
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '24px',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 0.5rem'
                }}>
                    {isSaving ? <span style={{fontSize: '0.7rem', color: '#854D0E'}}>Guardando...</span> : 
                     saved ? <span style={{fontSize: '0.7rem', color: '#15803D'}}>Guardado ✓</span> : null}
                </div>
                
                <div style={{padding: '1rem'}}>
                    <h3 style={{
                        margin: '0 0 0.5rem 0', 
                        fontSize: '0.9rem', 
                        color: '#854D0E', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px'
                    }}>
                        Notas Privadas
                    </h3>
                    <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={handleSave}
                        placeholder="Escribe una nota rápida..."
                        style={{
                            width: '100%',
                            minHeight: '120px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            resize: 'none',
                            outline: 'none',
                            color: '#4B5563',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <>
            {isInvitationModalOpen && person && clinic && <PatientInvitationModal person={person} clinic={clinic} onClose={() => setIsInvitationModalOpen(false)} />}
            {isPaymentModalOpen && person && <PaymentFormModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSave={() => { setIsPaymentModalOpen(false); fetchData(); }} person={person} servicePlans={servicePlans} />}
            {isPlanModalOpen && person && <PlanAssignmentModal isOpen={isPlanModalOpen} onClose={() => setPlanModalOpen(false)} onSave={() => { setPlanModalOpen(false); fetchData(); }} person={person} servicePlans={servicePlans} />}
            {isReferralModalOpen && person && <ReferPersonModal isOpen={isReferralModalOpen} onClose={() => setIsReferralModalOpen(false)} person={person} lastConsultation={consultations[0] || null} activePartners={activePartners} onSuccess={() => setIsReferralModalOpen(false)} />}
            {isAppointmentModalOpen && person && <AppointmentFormModal isOpen={isAppointmentModalOpen} onClose={() => { setIsAppointmentModalOpen(false); setEditingAppointment(null); }} onSave={handleSaveAppointment} onDelete={handleDeleteAppointment} appointmentToEdit={editingAppointment} personId={personId} currentUser={user} teamMembers={teamMembers} isCurrentUserAdmin={role === 'admin'} servicePlans={servicePlans} personsList={persons} />}
            <ConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={handleConfirm} title={`Confirmar Eliminación`} message={<p>{modalState.text}</p>} confirmText="Sí, eliminar"/>
            {isMealPlanModalOpen && person && <MealPlanGenerator person={person} lastConsultation={consultations[0] || null} onClose={() => setMealPlanModalOpen(false)} onPlanSaved={()=>{handlePlanSaved();fetchData()}} knowledgeResources={knowledgeResources} />}
            {isExercisePlanModalOpen && person && <ExercisePlanGenerator person={person} lastConsultation={consultations[0] || null} onClose={() => setExercisePlanModalOpen(false)} onPlanSaved={()=>{handlePlanSaved();fetchData()}} />}
            {(editingDietLog || isCreatingManualLog === 'diet') && <DietLogFormModal logToEdit={editingDietLog} personId={personId} onClose={()=>{handlePlanSaved();fetchData()}} />}
            {(editingExerciseLog || isCreatingManualLog === 'exercise') && <ExerciseLogFormModal logToEdit={editingExerciseLog} personId={personId} onClose={()=>{handlePlanSaved();fetchData()}} />}
            {isAllergyModalOpen && <AllergyFormModal isOpen={isAllergyModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} allergyToEdit={editingAllergy} />}
            {isMedicalHistoryModalOpen && <MedicalHistoryFormModal isOpen={isMedicalHistoryModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} historyToEdit={editingMedicalHistory} />}
            {isMedicationModalOpen && <MedicationFormModal isOpen={isMedicationModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} medicationToEdit={editingMedication} />}
            {isLifestyleModalOpen && <LifestyleFormModal isOpen={isLifestyleModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} habitsToEdit={lifestyleHabits} />}
            {isFileUploadModalOpen && <FileUploadModal isOpen={isFileUploadModalOpen} onClose={()=>{handleFileUploadSuccess();fetchData()}} personId={personId} />}
            {isReportModalOpen && person && <ReportModal person={person} consultations={consultations} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} onClose={() => setReportModalOpen(false)} isMobile={isMobile} nutritionistProfile={nutritionistProfile} clinic={clinic} />}
            {viewingConsultation && <ConsultationDetailModal consultation={viewingConsultation} onClose={() => setViewingConsultation(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingLog && <LogDetailModal log={viewingLog} onClose={() => setViewingLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingDietLog && <DietLogDetailModal log={viewingDietLog} onClose={() => setViewingDietLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingExerciseLog && <ExerciseLogDetailModal log={viewingExerciseLog} onClose={() => setViewingExerciseLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {isRoomModalOpen && appointmentToCall && <ConsultingRoomModal isOpen={isRoomModalOpen} onClose={() => { setIsRoomModalOpen(false); setAppointmentToCall(null); }} onConfirm={handleConfirmRoom} patientName={appointmentToCall.persons?.full_name || appointmentToCall.title} /> }


            {isConsultationMode && person ? (
                <ConsultationModePage person={person} personType={personType} consultations={consultations} logs={logs} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} planHistory={planHistory} appointments={appointments} allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} internalNotes={internalNotes} onDataRefresh={fetchData} onExit={handleFinishConsultation} isMobile={isMobile} setViewingConsultation={setViewingConsultation} setViewingLog={setViewingLog} setViewingDietLog={setViewingDietLog} setViewingExerciseLog={setViewingExerciseLog} clinic={clinic} subscription={subscription} />
            ) : (
                <div className="fade-in" style={{maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem'}}>
                    {/* 1. Header Card */}
                    {person && <PatientStickyHeader person={person} allergies={allergies} medicalHistory={medicalHistory} consultations={consultations} logs={logs} onBack={onBack} />}

                    {/* 2. Main Grid Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                        
                        {/* LEFT COLUMN: TABS & CONTENT */}
                        <div>
                             {/* Folder-Style Tab Bar */}
                             <div style={{
                                 display: 'flex', 
                                 gap: '0.25rem', // Slight gap for visual separation
                                 marginLeft: '1rem',
                                 marginBottom: '-1px', // Pulls content up to merge with tabs
                                 zIndex: 10,
                                 position: 'relative',
                                 overflowX: 'auto',
                                 paddingRight: '1rem'
                             }} className="hide-scrollbar">
                                {[
                                    { id: 'resumen', label: 'Resumen' },
                                    { id: 'expediente', label: 'Expediente', sub: 'allergies' },
                                    { id: 'planes', label: 'Planes', sub: 'current_plans' },
                                    { id: 'gestion', label: 'Gestión', sub: 'appointments' },
                                    { id: 'informacion', label: 'Información', sub: '' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabClick(tab.id, tab.sub)}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderTopLeftRadius: '8px',
                                            borderTopRightRadius: '8px',
                                            border: '1px solid transparent',
                                            borderBottom: activeTab === tab.id ? '1px solid var(--surface-color)' : '1px solid var(--border-color)', // Hide bottom border if active
                                            backgroundColor: activeTab === tab.id ? 'var(--surface-color)' : 'transparent',
                                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-light)',
                                            fontWeight: activeTab === tab.id ? 700 : 500,
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            zIndex: activeTab === tab.id ? 2 : 0, // Ensure active tab sits on top of content border
                                            borderColor: activeTab === tab.id ? 'var(--border-color)' : 'transparent',
                                            marginBottom: activeTab === tab.id ? '-1px' : '0' // Overlap
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content Container - Replicates Folder Content */}
                            <div style={{
                                backgroundColor: 'var(--surface-color)',
                                borderRadius: '8px',
                                borderTopLeftRadius: activeTab === 'resumen' ? '0' : '8px', // Visual tweak if desired
                                border: '1px solid var(--border-color)',
                                padding: '2rem',
                                boxShadow: 'var(--shadow)',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                {activeTab === 'resumen' && person && <SummaryTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} appointments={appointments} isMobile={isMobile} />}
                                
                                {activeTab === 'expediente' && (
                                    <ClinicalHistoryTab 
                                        allergies={allergies} 
                                        medicalHistory={medicalHistory} 
                                        medications={medications} 
                                        lifestyleHabits={lifestyleHabits} 
                                        consultations={consultations}
                                        memberMap={memberMap} 
                                        onEditAllergy={(a) => handleOpenClinicalHistoryModal('allergy', a)} 
                                        onEditMedicalHistory={(h) => handleOpenClinicalHistoryModal('medical', h)} 
                                        onEditMedication={(m) => handleOpenClinicalHistoryModal('medication', m)} 
                                        onEditLifestyle={() => setLifestyleModalOpen(true)} 
                                        openModal={openModal} 
                                    />
                                )}

                                {activeTab === 'planes' && (
                                     <section className="fade-in">
                                        <div style={{...styles.tabContainer, paddingLeft: 0, marginBottom: '-1px'}} className="hide-scrollbar">
                                            {[
                                                { key: 'current_plans', label: 'Planes actuales' },
                                                { key: 'calculated_plans', label: 'Calculados' },
                                                { key: 'log_files', label: 'Bitácora/Archivos' },
                                                { key: 'daily_tracking', label: 'Auto-Registro' }
                                            ].map(sub => (
                                                <button
                                                    key={sub.key}
                                                    style={activeSubTab === sub.key ? {...styles.folderTab, ...styles.folderTabActive} : styles.folderTab}
                                                    onClick={() => setActiveSubTab(sub.key)}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={styles.nestedFolderContent}>
                                            {activeSubTab === 'current_plans' && <PlansTab allDietLogs={allDietLogs} allExerciseLogs={allExerciseLogs} onGenerateMeal={() => setMealPlanModalOpen(true)} onGenerateExercise={() => setExercisePlanModalOpen(true)} onAddManualDiet={() => setIsCreatingManualLog('diet')} onAddManualExercise={() => setIsCreatingManualLog('exercise')} onEditDietLog={setEditingDietLog} onViewDietLog={setViewingDietLog} onEditExerciseLog={setEditingExerciseLog} onViewExerciseLog={setViewingExerciseLog} openModal={openModal} hasAiFeature={hasAiFeature} personName={person?.full_name} />}
                                            {activeSubTab === 'calculated_plans' && <CalculatedPlansTab planHistory={planHistory} navigate={navigate} openModal={openModal} />}
                                            {activeSubTab === 'log_files' && (
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                                                    <div style={{minWidth: 0}}>
                                                        <LogTab logs={logs} memberMap={memberMap} onAdd={() => navigate('log-form', { personId: person!.id, personType })} onEdit={(id) => navigate('log-form', { personId: person!.id, personType, logId: id })} onView={setViewingLog} openModal={openModal} />
                                                    </div>
                                                    <div style={{minWidth: 0}}>
                                                        <FilesTab files={files} memberMap={memberMap} onAdd={() => setFileUploadModalOpen(true)} onDelete={(file) => openModal('deleteFile', file.id, `¿Eliminar el archivo "${file.file_name}"?`, file.file_path)} />
                                                    </div>
                                                </div>
                                            )}
                                            {activeSubTab === 'daily_tracking' && <DailyTrackingTab checkins={dailyCheckins} />}
                                        </div>
                                    </section>
                                )}

                                {activeTab === 'informacion' && person && (
                                    <InfoTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} onRegisterConsent={handleRegisterConsent} onRevokeConsent={handleRevokeConsent} onExportData={handleExportData} onUploadConsent={handleConsentFileUpload} isUploadingConsent={isUploadingConsent} openModal={openModal} onManagePlan={() => setPlanModalOpen(true)} servicePlans={servicePlans} />
                                )}

                                {activeTab === 'gestion' && (
                                     <section className="fade-in">
                                        <div style={{...styles.tabContainer, paddingLeft: 0, marginBottom: '-1px'}} className="hide-scrollbar">
                                            {[
                                                { key: 'appointments', label: 'Citas' },
                                                { key: 'team', label: 'Equipo' }
                                            ].map(sub => (
                                                <button
                                                    key={sub.key}
                                                    style={activeSubTab === sub.key ? {...styles.folderTab, ...styles.folderTabActive} : styles.folderTab}
                                                    onClick={() => setActiveSubTab(sub.key)}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                         <div style={styles.nestedFolderContent}>
                                            {activeSubTab === 'appointments' && <AppointmentsTab appointments={appointments} memberMap={memberMap} onAdd={() => setIsAppointmentModalOpen(true)} onEdit={(a) => {setEditingAppointment(a); setIsAppointmentModalOpen(true);}} />}
                                            {activeSubTab === 'team' && <TeamTab careTeam={careTeam} allTeamMembers={teamMembers} personId={personId} isAdmin={role === 'admin'} onTeamUpdate={fetchData} internalNotes={internalNotes} user={user} />}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SIDEBAR WIDGETS */}
                        {!isMobile && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <QuickActionsWidget />
                                <PrivateNotesWidget />
                                <MacroDistributionWidget />
                                <NextAppointmentWidget />
                            </div>
                        )}
                        
                        {/* Mobile Sidebar Content below main content */}
                        {isMobile && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                <QuickActionsWidget />
                                <PrivateNotesWidget />
                                <MacroDistributionWidget />
                                <NextAppointmentWidget />
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
};

export default PersonDetailPage;