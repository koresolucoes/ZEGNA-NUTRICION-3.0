import React, { FC, useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, DailyCheckin, File as PersonFile, NutritionistProfile, TeamMember, CareTeamMemberProfile, InternalNoteWithAuthor, CareTeam, InternalNote, DietPlanHistoryItem, Appointment, AppointmentWithPerson, Clinic, PatientServicePlan, PopulatedPartnership, KnowledgeResource } from '../types';
import { createPortal } from 'react-dom';

// Shared Components
import PlanStatusIndicator from '../components/shared/PlanStatusIndicator';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import PatientStickyHeader from '../components/shared/PatientStickyHeader';
import ReportModal from '../components/ReportModal';
import ConsultingRoomModal from '../components/shared/ConsultingRoomModal';

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

// Helper to compare dates without time
const areDatesEqual = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

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
                body: JSON.stringify({
                    person_id: person.id,
                    email: email,
                    clinic_id: clinic.id
                })
            });

            const result = await response.json();
            if(!response.ok) {
                throw new Error(result.error || 'Failed to send invitation');
            }
            setSuccess(result.message);
            setTimeout(onClose, 3000); // Close modal on success after a delay
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Invitar Paciente al Portal</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <p>Se creará una invitación para que <strong>{person.full_name}</strong> pueda crear su cuenta y acceder a su portal personal.</p>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <label htmlFor="invite-email">Correo Electrónico del Paciente*</label>
                    <input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        disabled={!!success}
                    />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !!success}>{loading ? 'Enviando...' : success ? 'Invitación Creada' : 'Crear Invitación'}</button>
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
    const [activeSubTab, setActiveSubTab] = useState('');
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
        setActiveSubTab(defaultSubTab);
    };

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true); setError(null);
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
            const firstError = responses.map(res => res.error).find(err => err && err.code !== 'PGRST116'); // Ignore "no rows" for single()
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
            setKnowledgeResources(resourcesRes.data || []);
            
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
            setLoading(false);
        }
    }, [personId, clinic]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!clinic || !personId) return;
        const channel = supabase.channel(`person-detail-${personId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persons', filter: `id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'logs', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_logs', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_logs', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'allergies_intolerances', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_history', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lifestyle_habits', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_checkins', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'care_team', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_notes', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_plan_history', filter: `person_id=eq.${personId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `person_id=eq.${personId}` }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchData, personId, clinic]);

    const checkedInAppointmentForToday = useMemo(() => {
        const today = new Date();
        return appointments.find(a =>
            a.status === 'checked-in' &&
            areDatesEqual(new Date(a.start_time), today)
        );
    }, [appointments]);

    const handleCallPatient = () => {
        if (checkedInAppointmentForToday) {
            setAppointmentToCall(checkedInAppointmentForToday);
            setIsRoomModalOpen(true);
        }
    };

    const handleConfirmRoom = async (room: string) => {
        if (appointmentToCall) {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'called', consulting_room: room })
                .eq('id', appointmentToCall.id);
            if (error) {
                setError(error.message);
            }
        }
        setIsRoomModalOpen(false);
        setAppointmentToCall(null);
    };

    // Modal and Form Handlers
    const handlePlanSaved = () => { setMealPlanModalOpen(false); setExercisePlanModalOpen(false); setEditingDietLog(null); setEditingExerciseLog(null); setIsCreatingManualLog(null); }
    const handleClinicalHistorySave = () => { setAllergyModalOpen(false); setEditingAllergy(null); setMedicalHistoryModalOpen(false); setEditingMedicalHistory(null); setMedicationModalOpen(false); setEditingMedication(null); setLifestyleModalOpen(false); }
    const handleFileUploadSuccess = () => setFileUploadModalOpen(false);
    const openModal = (action: any, id: string, text: string, fileToDeletePath?: string) => setModalState({ isOpen: true, action, idToDelete: id, text, fileToDeletePath });
    const closeModal = () => setModalState({ isOpen: false, action: null, idToDelete: null, text: null, fileToDeletePath: null });

    const handleSaveAppointment = async (formData: any) => {
        if (!clinic) return;
        try {
            const payload = { clinic_id: clinic.id, user_id: formData.user_id, person_id: formData.person_id || null, title: formData.title, notes: formData.notes, status: formData.status, start_time: new Date(formData.start_time).toISOString(), end_time: new Date(formData.end_time).toISOString() };
            
            // --- GAMIFICATION LOGIC ---
            const wasCompleted = editingAppointment?.status === 'completed';
            const isNowCompleted = formData.status === 'completed';
    
            if (formData.id && !wasCompleted && isNowCompleted && formData.person_id) {
                const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                    p_person_id: formData.person_id,
                    p_appointment_id: formData.id
                });
                if (rpcError) console.warn('Could not award points on appointment completion:', rpcError.message);
            }
            // --- END GAMIFICATION ---

            if (formData.id) {
                await supabase.from('appointments').update(payload).eq('id', formData.id);
            } else {
                const { data, error } = await supabase.from('appointments').insert(payload).select().single();
                if (error) throw error;
                // Award points if a new appointment is created as 'completed'
                if (data && isNowCompleted && data.person_id) {
                     const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                        p_person_id: data.person_id,
                        p_appointment_id: data.id
                    });
                    if (rpcError) console.warn('Could not award points on new completed appointment:', rpcError.message);
                }
            }
            setIsAppointmentModalOpen(false); setEditingAppointment(null);
        } catch (err: any) { 
            console.error("Error saving appointment:", err); 
            setError(`Error al guardar cita: ${err.message}`); 
        }
    };
    
    const handleDeleteAppointment = async (appointmentId: string) => {
        try { await supabase.from('appointments').delete().eq('id', appointmentId); setIsAppointmentModalOpen(false); setEditingAppointment(null); fetchData(); } 
        catch (err: any) { console.error("Error deleting appointment:", err); setError(`Error al eliminar cita: ${err.message}`); }
    };

    const handleConfirm = async () => {
        const { action, idToDelete, fileToDeletePath } = modalState;
        if (!action || !idToDelete) return;

        if (action === 'deletePerson') {
            const { error } = await supabase.from('persons').delete().eq('id', idToDelete);
            if (error) {
                setError(`Error al eliminar: ${error.message}`);
            } else {
                onBack(); // Go back to the list after deleting
            }
            closeModal();
            return;
        }
        
        if ((action === 'deleteFile' || action === 'deleteConsentFile') && fileToDeletePath) {
            const { error: storageError } = await supabase.storage.from('files').remove([fileToDeletePath]);
            if (storageError) { setError(`Error al eliminar el archivo del almacenamiento: ${storageError.message}`); closeModal(); return; }
        }

        if (action === 'deleteConsentFile') {
            const { error: dbError } = await supabase.from('persons').update({ consent_file_url: null }).eq('id', idToDelete);
            if (dbError) setError(dbError.message);
            closeModal();
            return;
        }
        
        const tables = { deleteLog: 'logs', deleteConsultation: 'consultations', deleteDietLog: 'diet_logs', deleteExerciseLog: 'exercise_logs', deleteAllergy: 'allergies_intolerances', deleteMedicalHistory: 'medical_history', deleteMedication: 'medications', deleteFile: 'files', deletePlanHistory: 'diet_plan_history' };
        // @ts-ignore
        const tableName = tables[action];
        if (!tableName) return;
        
        const { error } = await supabase.from(tableName).delete().eq('id', idToDelete);
        if (error) setError(error.message);
        closeModal();
    }

    const handleRegisterConsent = async () => {
        if (!person) return;
        const { error } = await supabase
            .from('persons')
            .update({ consent_given_at: new Date().toISOString() })
            .eq('id', person.id);
        if (error) {
            setError(`Error al registrar consentimiento: ${error.message}`);
        } else {
            fetchData(); // Refresh data to show the new consent date
        }
    };
    
    const handleConsentFileUpload = async (file: File) => {
        if (!person) return;
        setIsUploadingConsent(true);
        setError(null);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `consent-forms/${person.id}/consentimiento_firmado.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath);
            const newUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

            const { error: dbError } = await supabase.from('persons').update({ consent_file_url: newUrl }).eq('id', person.id);
            if (dbError) throw dbError;

            fetchData();
        } catch(err: any) {
            setError(`Error al subir el documento: ${err.message}`);
        } finally {
            setIsUploadingConsent(false);
        }
    };


    const handleRevokeConsent = () => {
        if (!person) return;
        openModal(
            'deletePerson', 
            person.id, 
            `¿Estás seguro de que quieres revocar el consentimiento y eliminar permanentemente todos los datos de ${person.full_name}? Esta acción es irreversible y cumple con la solicitud de Cancelación de datos del paciente.`
        );
    };

    const handleExportData = async () => {
        if (!person) return;
        const exportData = {
            person,
            consultations,
            logs,
            dietLogs: allDietLogs,
            exerciseLogs: allExerciseLogs,
            allergies,
            medicalHistory,
            medications,
            lifestyleHabits,
            dailyCheckins,
            files,
            careTeam,
            internalNotes,
            planHistory,
            appointments,
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(exportData, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `Expediente_${person.full_name.replace(/\s/g, '_')}.json`;
        link.click();
    };


    const handleFinishConsultation = async () => {
        const now = new Date();
        const currentAppointment = appointments.find(a => 
            ['in-consultation', 'called'].includes(a.status) &&
            areDatesEqual(new Date(a.start_time), now)
        );

        if (currentAppointment) {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', currentAppointment.id);
            
            if (updateError) {
                setError(`Error al finalizar la consulta: ${updateError.message}`);
            } else {
                // Award points only if the update was successful
                if (currentAppointment.person_id) {
                    const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                        p_person_id: currentAppointment.person_id,
                        p_appointment_id: currentAppointment.id
                    });

                    if (rpcError) {
                        console.warn('Could not award points for consultation attendance:', rpcError);
                    }
                }
            }
        } else {
            console.warn("Se salió del modo consulta sin una cita activa para completar.");
        }
        
        setConsultationMode(false);
    };

    if (loading) return <div className="fade-in"><p>Cargando datos...</p></div>;
    if (error) return <div className="fade-in"><p style={styles.error}>Error: {error}</p></div>;
    if (!person || !clinic) return <div className="fade-in"><p>Persona no encontrada.</p></div>;

    const handleOpenClinicalHistoryModal = (type: 'allergy' | 'medical' | 'medication', item: any | null) => {
        if (type === 'allergy') { setEditingAllergy(item); setAllergyModalOpen(true); }
        if (type === 'medical') { setEditingMedicalHistory(item); setMedicalHistoryModalOpen(true); }
        if (type === 'medication') { setEditingMedication(item); setMedicationModalOpen(true); }
    };

    const renderActiveTab = () => {
        switch(activeTab) {
            case 'resumen':
                return <SummaryTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} appointments={appointments} isMobile={isMobile} onRegisterPayment={() => setIsPaymentModalOpen(true)} />;
            case 'expediente':
                return (
                    <section className="fade-in">
                        <nav className="sub-tabs">
                            <button className={`sub-tab-button ${activeSubTab === 'clinical_history' ? 'active' : ''}`} onClick={() => setActiveSubTab('clinical_history')}>H. Clínico</button>
                            <button className={`sub-tab-button ${activeSubTab === 'consultations' ? 'active' : ''}`} onClick={() => setActiveSubTab('consultations')}>Consultas</button>
                            <button className={`sub-tab-button ${activeSubTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveSubTab('progress')}>Progreso</button>
                        </nav>
                        {activeSubTab === 'clinical_history' && <ClinicalHistoryTab allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} memberMap={memberMap} onEditAllergy={(a) => handleOpenClinicalHistoryModal('allergy', a)} onEditMedicalHistory={(h) => handleOpenClinicalHistoryModal('medical', h)} onEditMedication={(m) => handleOpenClinicalHistoryModal('medication', m)} onEditLifestyle={() => setLifestyleModalOpen(true)} openModal={openModal} />}
                        {activeSubTab === 'consultations' && <ConsultationsTab consultations={consultations} memberMap={memberMap} onAdd={() => navigate('consultation-form', { personId: person.id, personType })} onEdit={(id) => navigate('consultation-form', { personId: person.id, personType, consultationId: id })} onView={setViewingConsultation} openModal={openModal} />}
                        {activeSubTab === 'progress' && <ProgressTab consultations={consultations} isMobile={isMobile} />}
                    </section>
                );
            case 'planes':
                 return (
                    <section className="fade-in">
                        <nav className="sub-tabs">
                            <button className={`sub-tab-button ${activeSubTab === 'current_plans' ? 'active' : ''}`} onClick={() => setActiveSubTab('current_plans')}>Planes Actuales</button>
                            <button className={`sub-tab-button ${activeSubTab === 'calculated_plans' ? 'active' : ''}`} onClick={() => setActiveSubTab('calculated_plans')}>Planes Calculados</button>
                            <button className={`sub-tab-button ${activeSubTab === 'log_files' ? 'active' : ''}`} onClick={() => setActiveSubTab('log_files')}>Bitácora y Archivos</button>
                            <button className={`sub-tab-button ${activeSubTab === 'daily_tracking' ? 'active' : ''}`} onClick={() => setActiveSubTab('daily_tracking')}>Auto-Registro</button>
                        </nav>
                        {activeSubTab === 'current_plans' && <PlansTab allDietLogs={allDietLogs} allExerciseLogs={allExerciseLogs} onGenerateMeal={() => setMealPlanModalOpen(true)} onGenerateExercise={() => setExercisePlanModalOpen(true)} onAddManualDiet={() => setIsCreatingManualLog('diet')} onAddManualExercise={() => setIsCreatingManualLog('exercise')} onEditDietLog={setEditingDietLog} onViewDietLog={setViewingDietLog} onEditExerciseLog={setEditingExerciseLog} onViewExerciseLog={setViewingExerciseLog} openModal={openModal} hasAiFeature={hasAiFeature} />}
                        {activeSubTab === 'calculated_plans' && <CalculatedPlansTab planHistory={planHistory} navigate={navigate} openModal={openModal} />}
                        {activeSubTab === 'log_files' && (
                            <div>
                                <LogTab logs={logs} memberMap={memberMap} onAdd={() => navigate('log-form', { personId: person.id, personType })} onEdit={(id) => navigate('log-form', { personId: person.id, personType, logId: id })} onView={setViewingLog} openModal={openModal} />
                                <div style={{marginTop: '2rem'}}><FilesTab files={files} memberMap={memberMap} onAdd={() => setFileUploadModalOpen(true)} onDelete={(file) => openModal('deleteFile', file.id, `¿Eliminar el archivo "${file.file_name}"?`, file.file_path)} /></div>
                            </div>
                        )}
                        {activeSubTab === 'daily_tracking' && <DailyTrackingTab checkins={dailyCheckins} />}
                    </section>
                 );
            case 'gestion':
                return (
                    <section className="fade-in">
                        <nav className="sub-tabs">
                            <button className={`sub-tab-button ${activeSubTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveSubTab('appointments')}>Citas</button>
                            <button className={`sub-tab-button ${activeSubTab === 'team' ? 'active' : ''}`} onClick={() => setActiveSubTab('team')}>Equipo y Notas</button>
                            <button className={`sub-tab-button ${activeSubTab === 'info' ? 'active' : ''}`} onClick={() => setActiveSubTab('info')}>Información</button>
                        </nav>
                        {activeSubTab === 'appointments' && <AppointmentsTab appointments={appointments} memberMap={memberMap} onAdd={() => setIsAppointmentModalOpen(true)} onEdit={(a) => {setEditingAppointment(a); setIsAppointmentModalOpen(true);}} />}
                        {activeSubTab === 'team' && <TeamTab careTeam={careTeam} allTeamMembers={teamMembers} personId={personId} isAdmin={role === 'admin'} onTeamUpdate={fetchData} internalNotes={internalNotes} user={user} />}
                        {activeSubTab === 'info' && <InfoTab person={person} consultations={consultations} allergies={allergies} medicalHistory={medicalHistory} onRegisterConsent={handleRegisterConsent} onRevokeConsent={handleRevokeConsent} onExportData={handleExportData} onUploadConsent={handleConsentFileUpload} isUploadingConsent={isUploadingConsent} openModal={openModal} onManagePlan={() => setPlanModalOpen(true)} servicePlans={servicePlans} />}
                    </section>
                );
            default: return null;
        }
    };

    return (
        <>
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
            {viewingConsultation && <ConsultationDetailModal consultation={viewingConsultation} onClose={() => setViewingConsultation(null)} />}
            {viewingLog && <LogDetailModal log={viewingLog} onClose={() => setViewingLog(null)} />}
            {viewingDietLog && <DietLogDetailModal log={viewingDietLog} onClose={() => setViewingDietLog(null)} />}
            {viewingExerciseLog && <ExerciseLogDetailModal log={viewingExerciseLog} onClose={() => setViewingExerciseLog(null)} />}
            {isRoomModalOpen && appointmentToCall && <ConsultingRoomModal isOpen={isRoomModalOpen} onClose={() => { setIsRoomModalOpen(false); setAppointmentToCall(null); }} onConfirm={handleConfirmRoom} patientName={appointmentToCall.persons?.full_name || appointmentToCall.title} /> }

            {isConsultationMode ? (
                <ConsultationModePage person={person} personType={personType} consultations={consultations} logs={logs} dietLogs={allDietLogs} exerciseLogs={allExerciseLogs} planHistory={planHistory} appointments={appointments} allergies={allergies} medicalHistory={medicalHistory} medications={medications} lifestyleHabits={lifestyleHabits} internalNotes={internalNotes} onDataRefresh={fetchData} onExit={handleFinishConsultation} isMobile={isMobile} setViewingConsultation={setViewingConsultation} setViewingLog={setViewingLog} setViewingDietLog={setViewingDietLog} setViewingExerciseLog={setViewingExerciseLog} clinic={clinic} subscription={subscription} />
            ) : (
                <div className="fade-in">
                    <PatientStickyHeader person={person} allergies={allergies} medicalHistory={medicalHistory} consultations={consultations} logs={logs} />
                    <div style={{...styles.pageHeader, borderBottom: 'none', paddingTop: 0}}>
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                            <button onClick={() => { onStartConsultation(); setConsultationMode(true); }}>Iniciar Consulta</button>
                            {checkedInAppointmentForToday && (
                                <button onClick={handleCallPatient} className="button-secondary">{ICONS.send} Llamar a Consulta</button>
                            )}
                             <button onClick={() => setIsReferralModalOpen(true)} className="button-secondary">{ICONS.send} Referir</button>
                            {!person.user_id && personType === 'client' && (
                                <button onClick={() => setIsInvitationModalOpen(true)} className="button-secondary">{ICONS.send} Invitar al Portal</button>
                            )}
                            <button onClick={() => setReportModalOpen(true)} className="button-secondary">{ICONS.print} Generar Reporte</button>
                            <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
                        </div>
                    </div>
                    <nav className="tabs">
                        <button className={`tab-button ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => handleTabClick('resumen')}>Resumen</button>
                        <button className={`tab-button ${activeTab === 'expediente' ? 'active' : ''}`} onClick={() => handleTabClick('expediente', 'clinical_history')}>Expediente Clínico</button>
                        <button className={`tab-button ${activeTab === 'planes' ? 'active' : ''}`} onClick={() => handleTabClick('planes', 'current_plans')}>Planes y Seguimiento</button>
                        <button className={`tab-button ${activeTab === 'gestion' ? 'active' : ''}`} onClick={() => handleTabClick('gestion', 'appointments')}>Gestión y Admin.</button>
                    </nav>
                    <div>{renderActiveTab()}</div>
                </div>
            )}
        </>
    );
};

export default PersonDetailPage;
