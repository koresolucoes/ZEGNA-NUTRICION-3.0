
import React, { FC, useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, DailyCheckin, File as PersonFile, NutritionistProfile, TeamMember, CareTeamMemberProfile, InternalNoteWithAuthor, DietPlanHistoryItem, AppointmentWithPerson, Clinic, PatientServicePlan, PopulatedPartnership, KnowledgeResource, CareTeam } from '../types';
import { createPortal } from 'react-dom';

// Shared Components
import PlanStatusIndicator from '../components/shared/PlanStatusIndicator';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import PatientStickyHeader from '../components/shared/PatientStickyHeader';
import ReportModal from '../components/ReportModal';
import ConsultingRoomModal from '../components/shared/ConsultingRoomModal';
import SkeletonLoader from '../components/shared/SkeletonLoader';

// Modals
import MealPlanGenerator from '../components/MealPlanGenerator';
import ExercisePlanGenerator from '../components/ExercisePlanGenerator';
import DietLogFormModal from '../components/forms/DietLogFormModal';
import ExerciseLogFormModal from '../components/forms/ExerciseLogFormModal';
import ConsultationDetailModal from '../components/modals/ConsultationDetailModal';
import LogDetailModal from '../components/modals/LogDetailModal';
import DietLogDetailModal from '../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../components/modals/ExerciseLogDetailModal';
import AllergyFormModal from '../components/forms/AllergyFormModal';
import MedicalHistoryFormModal from '../components/forms/MedicalHistoryFormModal';
import MedicationFormModal from '../components/forms/MedicationFormModal';
import LifestyleFormModal from '../components/forms/LifestyleFormModal';
import { FileUploadModal } from '../components/forms/FileUploadModal';
import AppointmentFormModal from '../components/forms/AppointmentFormModal';
import ReferPersonModal from '../components/person_detail/ReferPersonModal';
import PaymentFormModal from '../components/person_detail/PaymentFormModal';
import PlanAssignmentModal from '../components/person_detail/PlanAssignmentModal';

// Context & Pages
import { useClinic } from '../contexts/ClinicContext';
import ConsultationModePage from './ConsultationModePage';

// Tab Components
import { SummaryTab } from '../components/person_detail/tabs/SummaryTab';
import { InfoTab } from '../components/person_detail/tabs/InfoTab';
import { ClinicalHistoryTab } from '../components/person_detail/tabs/ClinicalHistoryTab';
import { ConsultationsTab } from '../components/person_detail/tabs/ConsultationsTab';
import { AppointmentsTab } from '../components/person_detail/tabs/AppointmentsTab';
import { PlansTab } from '../components/person_detail/tabs/PlansTab';
import { CalculatedPlansTab } from '../components/person_detail/tabs/CalculatedPlansTab';
import { ProgressTab } from '../components/person_detail/tabs/ProgressTab';
import { LogTab } from '../components/person_detail/tabs/LogTab';
import { FilesTab } from '../components/person_detail/tabs/FilesTab';
import { DailyTrackingTab } from '../components/person_detail/tabs/DailyTrackingTab';
import { TeamTab } from '../components/person_detail/tabs/TeamTab';

const modalRoot = document.getElementById('modal-root');

// --- Invitation Modal Component ---
const PatientInvitationModal: FC<{person: Person, clinic: Clinic, onClose: () => void}> = ({person, clinic, onClose}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/invite-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_id: person.id, email: email, clinic_id: clinic.id })
            });
            const result = await response.json();
            if(!response.ok) throw new Error(result.error || 'Failed to send invitation');
            setSuccess(result.message);
            setTimeout(onClose, 3000);
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    if (!modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}}>
                <div style={styles.modalHeader}><h2 style={styles.modalTitle}>Invitar Paciente al Portal</h2><button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button></div>
                <div style={styles.modalBody}>
                    <p>Se creará una invitación para que <strong>{person.full_name}</strong> pueda crear su cuenta.</p>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    <label htmlFor="invite-email">Correo Electrónico del Paciente*</label>
                    <input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!success} />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !!success}>{loading ? 'Enviando...' : success ? 'Invitación Creada' : 'Crear Invitación'}</button>
                </div>
            </form>
        </div>, modalRoot
    );
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
    const [activeSubTab, setActiveSubTab] = useState('clinical_history'); // Default subtab for Expediente
    const [isConsultationMode, setConsultationMode] = useState(initialConsultationMode);
    const [isUploadingConsent, setIsUploadingConsent] = useState(false);
    
    // Modal & Form States
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
                supabase.from('internal_notes').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('diet_plan_history').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('person_id', personId).order('start_time', { ascending: false }),
                supabase.from('patient_service_plans').select('*').eq('clinic_id', clinic.id),
                supabase.from('persons').select('*').eq('clinic_id', clinic.id),
                supabase.from('clinic_ally_partnerships').select('*, allies(*)').eq('clinic_id', clinic.id).eq('status', 'active'),
                supabase.from('knowledge_base_resources').select('title, type').eq('clinic_id', clinic.id).eq('type', 'Receta')
            ]);

            const responses = [personRes, consultRes, logsRes, dietRes, exerciseRes, allergiesRes, medicalHistoryRes, medicationsRes, lifestyleRes, checkinsRes, filesRes, teamMembersRes, careTeamRes, internalNotesRes, planHistoryRes, appointmentsRes, plansRes, personsRes, partnersRes, resourcesRes];
            const firstError = responses.map(res => res.error).find(err => err && err.code !== 'PGRST116');
            if (firstError) throw firstError;
            
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
            setKnowledgeResources(resourcesRes.data as unknown as KnowledgeResource[] || []);
            
            const teamMembersData = teamMembersRes.data || [];
            setTeamMembers(teamMembersData);
            const teamMembersMap = new Map(teamMembersData.map(m => [m.user_id, m]));

            const careTeamData = careTeamRes.data as CareTeam[] || [];
            const populatedCareTeam = careTeamData.map(careMember => ({ ...careMember, team_members_with_profiles: teamMembersData.find(tm => tm.user_id === careMember.user_id) || null }));
            setCareTeam(populatedCareTeam);
            
            const internalNotesData = internalNotesRes.data || [];
            const populatedInternalNotes = internalNotesData.map(note => ({
                ...note,
                team_members_with_profiles: teamMembersMap.get(note.user_id) || null
            }));
            setInternalNotes(populatedInternalNotes as InternalNoteWithAuthor[]);

        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [personId, clinic]);

    useEffect(() => { fetchData(); }, [fetchData]);

    
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
    const handleConfirmRoom = async (room: string) => {
        if (appointmentToCall) {
            await supabase.from('appointments').update({ status: 'called', consulting_room: room }).eq('id', appointmentToCall.id);
            setIsRoomModalOpen(false); setAppointmentToCall(null);
        }
    };
    
    const handleSaveAppointment = async (formData: any) => { /* ... implementation ... */ fetchData(); setIsAppointmentModalOpen(false); };
    const handleDeleteAppointment = async (id: string) => { await supabase.from('appointments').delete().eq('id', id); fetchData(); setIsAppointmentModalOpen(false); };
    const handleRegisterConsent = async () => { if (person) await supabase.from('persons').update({ consent_given_at: new Date().toISOString() }).eq('id', person.id); fetchData(); };
    const handleRevokeConsent = () => { if (person) openModal('deletePerson', person.id, 'Revocar y Eliminar'); };
    const handleExportData = () => { /* ... impl ... */ };
    const handleConsentFileUpload = async (file: File) => { /* ... impl ... */ fetchData(); setIsUploadingConsent(false); };
    const handleFinishConsultation = () => { setConsultationMode(false); fetchData(); };

    const handleConfirm = async () => {
        if (!modalState.idToDelete || !modalState.action) return;
        const { action, idToDelete, fileToDeletePath } = modalState;
        
        try {
            if (action === 'deleteFile' || action === 'deleteConsentFile') {
                if (fileToDeletePath) {
                    const { error: storageError } = await supabase.storage.from('files').remove([fileToDeletePath]);
                    if (storageError) console.error('Error deleting file from storage:', storageError);
                }
                if (action === 'deleteFile') {
                    await supabase.from('files').delete().eq('id', idToDelete);
                } else {
                    await supabase.from('persons').update({ consent_file_url: null }).eq('id', idToDelete);
                }
            } else if (action === 'deleteDietLog') {
                await supabase.from('diet_logs').delete().eq('id', idToDelete);
            } else if (action === 'deleteExerciseLog') {
                await supabase.from('exercise_logs').delete().eq('id', idToDelete);
            } else if (action === 'deleteLog') {
                await supabase.from('logs').delete().eq('id', idToDelete);
            } else if (action === 'deletePerson') {
                await supabase.from('persons').delete().eq('id', idToDelete);
                if (idToDelete === personId) {
                     onBack();
                     return;
                }
            } else if (action === 'deleteAllergy') {
                await supabase.from('allergies_intolerances').delete().eq('id', idToDelete);
            } else if (action === 'deleteMedicalHistory') {
                await supabase.from('medical_history').delete().eq('id', idToDelete);
            } else if (action === 'deleteMedication') {
                await supabase.from('medications').delete().eq('id', idToDelete);
            } else if (action === 'deleteConsultation') {
                await supabase.from('consultations').delete().eq('id', idToDelete);
            }
            
            closeModal();
            fetchData();
        } catch (error) {
            console.error("Error handling confirmation:", error);
        }
    };

    if (loading) return <div className="fade-in"><SkeletonLoader type="detail" count={4} /></div>;
    if (error) return <div className="fade-in"><p style={styles.error}>Error: {error}</p></div>;
    if (!person || !clinic) return <div className="fade-in"><p>Persona no encontrada.</p></div>;

    // --- SIDEBAR COMPONENT ---
    const Sidebar = () => {
        // Calculate macros from latest plan
        const latestPlan = planHistory.length > 0 ? planHistory[0] : null;
        const macros = latestPlan ? {
            p: latestPlan.totals.protein_g.toFixed(0),
            l: latestPlan.totals.lipid_g.toFixed(0),
            hc: latestPlan.totals.carb_g.toFixed(0),
            kcal: latestPlan.totals.kcal.toFixed(0)
        } : null;

        const MacroRow = ({label, value, color}: {label: string, value: string, color: string}) => (
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                <span style={{color: 'var(--text-light)'}}>{label}</span>
                <span style={{fontWeight: 600, color}}>{value}g</span>
            </div>
        );

        return (
            <div style={{ paddingTop: '0' }}>
                <div style={{ position: isMobile ? 'static' : 'sticky', top: '140px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={styles.detailCard}>
                        <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Acciones Rápidas</h3></div>
                        <div style={{...styles.detailCardBody, display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                            <button onClick={() => { onStartConsultation(); setConsultationMode(true); }}>Iniciar Consulta</button>
                            <button onClick={() => setIsPaymentModalOpen(true)} className="button-secondary">{ICONS.calculator} Registrar Cobro</button>
                             <button onClick={() => setReportModalOpen(true)} className="button-secondary">{ICONS.print} Generar Reporte</button>
                            {checkedInAppointmentForToday && <button onClick={handleCallPatient} className="button-secondary">{ICONS.send} Llamar a Consulta</button>}
                            <button onClick={() => setIsReferralModalOpen(true)} className="button-secondary">{ICONS.send} Referir Paciente</button>
                            {!person.user_id && personType === 'client' && <button onClick={() => setIsInvitationModalOpen(true)} className="button-secondary">{ICONS.send} Invitar al Portal</button>}
                        </div>
                    </div>

                    <div style={styles.detailCard}>
                         <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Distribución de Dieta</h3></div>
                         <div style={styles.detailCardBody}>
                            {macros ? (
                                <div>
                                    <div style={{textAlign: 'center', marginBottom: '1rem'}}>
                                        <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)'}}>{macros.kcal}</div>
                                        <div style={{fontSize: '0.75rem', color: 'var(--text-light)'}}>Kcal totales</div>
                                    </div>
                                    <MacroRow label="Proteína" value={macros.p} color="#EC4899" />
                                    <MacroRow label="Lípidos" value={macros.l} color="#F59E0B" />
                                    <MacroRow label="Carbohidratos" value={macros.hc} color="#3B82F6" />
                                </div>
                            ) : (
                                <div style={{textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.9rem'}}>
                                    Sin plan calculado.
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN CONTENT WITH FOLDER TABS ---
    const MainContent = () => (
        <div>
             <div style={styles.tabContainer} className="hide-scrollbar">
                {[
                    { id: 'resumen', label: 'Resumen', sub: '' },
                    { id: 'expediente', label: 'Expediente', sub: 'clinical_history' },
                    { id: 'planes', label: 'Planes', sub: 'current_plans' },
                    { id: 'gestion', label: 'Gestión', sub: 'appointments' },
                    { id: 'informacion', label: 'Información', sub: '' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id, tab.sub)}
                        style={activeTab === tab.id ? {...styles.folderTab, ...styles.folderTabActive} : styles.folderTab}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div style={styles.folderContent}>
                {activeTab === 'resumen' && <SummaryTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} appointments={appointments} isMobile={isMobile} />}
                
                {activeTab === 'expediente' && (
                    <section className="fade-in">
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
                    </section>
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
                            {activeSubTab === 'current_plans' && <PlansTab allDietLogs={allDietLogs} allExerciseLogs={allExerciseLogs} onGenerateMeal={() => setMealPlanModalOpen(true)} onGenerateExercise={() => setExercisePlanModalOpen(true)} onAddManualDiet={() => setIsCreatingManualLog('diet')} onAddManualExercise={() => setIsCreatingManualLog('exercise')} onEditDietLog={setEditingDietLog} onViewDietLog={setViewingDietLog} onEditExerciseLog={setEditingExerciseLog} onViewExerciseLog={setViewingExerciseLog} openModal={openModal} hasAiFeature={hasAiFeature} personName={person.full_name} />}
                            {activeSubTab === 'calculated_plans' && <CalculatedPlansTab planHistory={planHistory} navigate={navigate} openModal={openModal} />}
                            {activeSubTab === 'log_files' && (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                                    <div style={{minWidth: 0}}>
                                        <LogTab logs={logs} memberMap={memberMap} onAdd={() => navigate('log-form', { personId: person.id, personType })} onEdit={(id) => navigate('log-form', { personId: person.id, personType, logId: id })} onView={setViewingLog} openModal={openModal} />
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

                {activeTab === 'informacion' && (
                     <section className="fade-in">
                        <InfoTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} onRegisterConsent={handleRegisterConsent} onRevokeConsent={handleRevokeConsent} onExportData={handleExportData} onUploadConsent={handleConsentFileUpload} isUploadingConsent={isUploadingConsent} openModal={openModal} onManagePlan={() => setPlanModalOpen(true)} servicePlans={servicePlans} />
                    </section>
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
    );

    return (
        <>
            {/* Modals and Popups */}
            {isInvitationModalOpen && <PatientInvitationModal person={person} clinic={clinic!} onClose={() => setIsInvitationModalOpen(false)} />}
            {isPaymentModalOpen && <PaymentFormModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSave={() => { setIsPaymentModalOpen(false); fetchData(); }} person={person} servicePlans={servicePlans} />}
            {isPlanModalOpen && <PlanAssignmentModal isOpen={isPlanModalOpen} onClose={() => setPlanModalOpen(false)} onSave={() => { setPlanModalOpen(false); fetchData(); }} person={person} servicePlans={servicePlans} />}
            {isReferralModalOpen && <ReferPersonModal isOpen={isReferralModalOpen} onClose={() => setIsReferralModalOpen(false)} person={person} lastConsultation={consultations[0] || null} activePartners={activePartners} onSuccess={() => setIsReferralModalOpen(false)} />}
            {isAppointmentModalOpen && <AppointmentFormModal isOpen={isAppointmentModalOpen} onClose={() => { setIsAppointmentModalOpen(false); setEditingAppointment(null); }} onSave={handleSaveAppointment} onDelete={handleDeleteAppointment} appointmentToEdit={editingAppointment} personId={personId} currentUser={user} teamMembers={teamMembers} isCurrentUserAdmin={role === 'admin'} servicePlans={servicePlans} personsList={persons} />}
            <ConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={handleConfirm} title={`Confirmar Eliminación`} message={<p>{modalState.text}</p>} confirmText="Sí, eliminar"/>
            {isMealPlanModalOpen && <MealPlanGenerator person={person} lastConsultation={consultations[0] || null} onClose={() => setMealPlanModalOpen(false)} onPlanSaved={()=>{handlePlanSaved();fetchData()}} knowledgeResources={knowledgeResources} />}
            {isExercisePlanModalOpen && <ExercisePlanGenerator person={person} lastConsultation={consultations[0] || null} onClose={() => setExercisePlanModalOpen(false)} onPlanSaved={()=>{handlePlanSaved();fetchData()}} />}
            {(editingDietLog || isCreatingManualLog === 'diet') && <DietLogFormModal logToEdit={editingDietLog} personId={personId} onClose={()=>{handlePlanSaved();fetchData()}} />}
            {(editingExerciseLog || isCreatingManualLog === 'exercise') && <ExerciseLogFormModal logToEdit={editingExerciseLog} personId={personId} onClose={()=>{handlePlanSaved();fetchData()}} />}
            {isAllergyModalOpen && <AllergyFormModal isOpen={isAllergyModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} allergyToEdit={editingAllergy} />}
            {isMedicalHistoryModalOpen && <MedicalHistoryFormModal isOpen={isMedicalHistoryModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} historyToEdit={editingMedicalHistory} />}
            {isMedicationModalOpen && <MedicationFormModal isOpen={isMedicationModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} medicationToEdit={editingMedication} />}
            {isLifestyleModalOpen && <LifestyleFormModal isOpen={isLifestyleModalOpen} onClose={()=>{handleClinicalHistorySave();fetchData()}} personId={personId} habitsToEdit={lifestyleHabits} />}
            {isFileUploadModalOpen && <FileUploadModal isOpen={isFileUploadModalOpen} onClose={()=>{handleFileUploadSuccess();fetchData()}} personId={personId} />}
            {isReportModalOpen && <ReportModal person={person} consultations={consultations} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} onClose={() => setReportModalOpen(false)} isMobile={isMobile} nutritionistProfile={nutritionistProfile} clinic={clinic} />}
            {viewingConsultation && <ConsultationDetailModal consultation={viewingConsultation} onClose={() => setViewingConsultation(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingLog && <LogDetailModal log={viewingLog} onClose={() => setViewingLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingDietLog && <DietLogDetailModal log={viewingDietLog} onClose={() => setViewingDietLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {viewingExerciseLog && <ExerciseLogDetailModal log={viewingExerciseLog} onClose={() => setViewingExerciseLog(null)} zIndex={isConsultationMode ? 2200 : 1050} />}
            {isRoomModalOpen && appointmentToCall && <ConsultingRoomModal isOpen={isRoomModalOpen} onClose={() => { setIsRoomModalOpen(false); setAppointmentToCall(null); }} onConfirm={handleConfirmRoom} patientName={appointmentToCall.persons?.full_name || appointmentToCall.title} /> }

            {isConsultationMode ? (
                <ConsultationModePage person={person} personType={personType} consultations={consultations} logs={logs} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} planHistory={planHistory} appointments={appointments} allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} internalNotes={internalNotes} onDataRefresh={fetchData} onExit={handleFinishConsultation} isMobile={isMobile} setViewingConsultation={setViewingConsultation} setViewingLog={setViewingLog} setViewingDietLog={setViewingDietLog} setViewingExerciseLog={setViewingExerciseLog} clinic={clinic} subscription={subscription} />
            ) : (
                <div className="fade-in">
                    <PatientStickyHeader person={person} allergies={allergies} medicalHistory={medicalHistory} consultations={consultations} logs={logs} />
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
                         <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
                    </div>
                    {/* UPDATED GRID LAYOUT FOR MOBILE RESPONSIVENESS */}
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem', alignItems: 'start' }}>
                        <div style={{ flex: isMobile ? 'none' : '2.5', width: '100%', minWidth: 0 }}>
                            <MainContent />
                        </div>
                        <div style={{ flex: isMobile ? 'none' : '1', width: '100%', minWidth: 0, order: isMobile ? -1 : 0 }}>
                             <Sidebar />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PersonDetailPage;
