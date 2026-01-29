
import { Database, Json } from './database.types';

// Core Types
export type OperatingScheduleItem = {
    day: number;
    active: boolean;
    start: string;
    end: string;
};

export type Clinic = Database['public']['Tables']['clinics']['Row'] & {
    theme?: string | null;
    // Old fields, kept for backwards compatibility
    operating_days?: number[] | null;
    operating_hours_start?: string | null;
    operating_hours_end?: string | null;
    // New flexible schedule field
    operating_schedule?: OperatingScheduleItem[] | null;
    // New fiscal fields
    rfc?: string | null;
    fiscal_regime?: string | null;
    // UI Layout
    navigation_layout?: 'sidebar' | 'header' | null;
};
export type ClinicMember = Omit<Database['public']['Tables']['clinic_members']['Row'], 'role'> & {
    role: 'admin' | 'nutritionist' | 'assistant' | 'receptionist';
};
export type TeamMember = Database['public']['Views']['team_members_with_profiles']['Row'] & {
    consulting_room?: string | null;
};
export type NutritionistProfile = Database['public']['Tables']['nutritionist_profiles']['Row'] & {
    consulting_room?: string | null;
};
export type NutritionistProfileForAllyView = {
    full_name: string | null;
    avatar_url: string | null;
    professional_title: string | null;
    biography: string | null;
};

// Unified Person Type (replaces Client and Afiliado)
export type Person = Database['public']['Tables']['persons']['Row'] & {
    user_id?: string | null;
    subscription_start_date?: string | null;
    current_plan_id?: string | null;
    gamification_points?: number;
    gamification_rank?: string;
    consent_given_at?: string | null;
    consent_file_url?: string | null; // Added field for consent document
    curp?: string | null;
    address?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    family_history?: string | null;
    // Fiscal data fields
    rfc?: string | null;
    fiscal_address?: string | null;
    fiscal_regime?: string | null;
};

// Unified Data Types (replaces Patient... and Member...)
export type Consultation = Database['public']['Tables']['consultations']['Row'];
export type LabResult = Database['public']['Tables']['lab_results']['Row'];
export type Log = Database['public']['Tables']['logs']['Row'];
export type DietLog = Database['public']['Tables']['diet_logs']['Row'] & {
    completed?: boolean;
};
export type ExerciseLog = Database['public']['Tables']['exercise_logs']['Row'] & {
    completed?: boolean;
};
export type Allergy = Database['public']['Tables']['allergies_intolerances']['Row'];
export type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];
export type Medication = Database['public']['Tables']['medications']['Row'];
export type LifestyleHabits = Database['public']['Tables']['lifestyle_habits']['Row'];
export type DailyCheckin = Database['public']['Tables']['daily_checkins']['Row'];
export type File = Database['public']['Tables']['files']['Row'];
export type PatientFile = File; // Alias for consistency with component imports
export type CareTeam = Database['public']['Tables']['care_team']['Row'];
export type InternalNote = Database['public']['Tables']['internal_notes']['Row'];
// Add GamificationLog type
export type GamificationLog = Database['public']['Tables']['gamification_log']['Row'];
export type BetaFeedback = Database['public']['Tables']['beta_feedback']['Row'];
export type Service = Database['public']['Tables']['services']['Row'] & {
    sat_product_code?: string | null;
    sat_unit_code?: string | null;
    sat_tax_object_code?: string | null;
};
// Add Patient Journal Entry
export type PatientJournalEntry = Database['public']['Tables']['patient_journal']['Row'];

// Agenda & Queue Types
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type QueueDisplay = Database['public']['Tables']['queue_displays']['Row'];
export type PatientInvitation = Database['public']['Tables']['patient_invitations']['Row'];

// --- Plan & Subscription Types ---
export type Plan = Database['public']['Tables']['plans']['Row'];
export type ClinicSubscription = Database['public']['Tables']['clinic_subscriptions']['Row'] & {
    mercadopago_subscription_id?: string | null;
    mercadopago_plan_id?: string | null;
};
export type PatientServicePlan = Database['public']['Tables']['patient_service_plans']['Row'] & {
    max_consultations?: number | null;
    features?: {
        patient_portal_ai_enabled?: boolean;
        gamification_enabled?: boolean;
        file_storage_limit_mb?: number;
    } | null;
    // New SAT Fields
    sat_product_code?: string | null;
    sat_unit_code?: string | null;
    sat_tax_object_code?: string | null;
};

// Other specific types
export type Ally = Database['public']['Tables']['allies']['Row'] & { 
    biography?: string | null; 
    avatar_url?: string | null;
    office_address?: string | null;
    website?: string | null;
    theme?: string | null;
};
export type Aliado = Ally; // Alias for compatibility
export type ClinicAllyPartnership = Database['public']['Tables']['clinic_ally_partnerships']['Row'];
export type AllyAllyPartnership = Database['public']['Tables']['ally_ally_partnerships']['Row'];
export type ClinicClinicPartnership = Database['public']['Tables']['clinic_clinic_partnerships']['Row'];
export type Referral = Database['public']['Tables']['referrals']['Row'];
export type KnowledgeResource = Database['public']['Tables']['knowledge_base_resources']['Row'];
export type PlanTemplate = Database['public']['Tables']['plan_templates']['Row'];
export type FoodEquivalent = Database['public']['Tables']['food_equivalents']['Row'];
// FIX: Add ReferralConsentRequest type
export type ReferralConsentRequest = Database['public']['Tables']['referral_consent_requests']['Row'];

// --- SMAE / Food Types ---
export type SmaeFood = {
    id: string;
    name: string;
    subgroup: string; // To link with FoodEquivalent
    amount: number;
    unit: string;
    gross_weight: number | null;
    net_weight: number | null;
    energy_kcal?: number;
    // New specific macros per portion
    protein_g?: number | null;
    lipid_g?: number | null;
    carb_g?: number | null;
};

// --- AI Agent & WhatsApp Types ---
export type AiAgent = Database['public']['Tables']['ai_agents']['Row'] & {
    tools?: Json | null; // Override Json type for easier access if needed
};
export type WhatsappConnection = Database['public']['Tables']['whatsapp_connections']['Row'];
export type WhatsappContact = Database['public']['Tables']['whatsapp_contacts']['Row'];
export type WhatsappMessage = Database['public']['Tables']['whatsapp_conversations']['Row'] & {
    message_type?: 'text' | 'image' | 'audio';
    media_url?: string | null;
    mime_type?: string | null;
};

// Re-export common database types that might be useful
export type ConsultationWithLabs = Consultation & {
    lab_results?: LabResult[];
};

export type AppointmentWithPerson = Appointment & {
    persons?: {
        full_name: string;
        avatar_url?: string | null;
        person_type?: string; // 'client' | 'member'
    } | null;
};

export type PopulatedClinicPartnership = ClinicClinicPartnership & {
    requester: Clinic;
    responder: Clinic;
};

export type PopulatedAllyPartnership = AllyAllyPartnership & {
    requester: Ally;
    responder: Ally;
};

export type PopulatedPartnership = ClinicAllyPartnership & {
    allies: Ally;
    clinics?: Clinic;
};

export type PopulatedReferral = Referral & {
    persons?: Person | null;
    sending_clinic?: { name: string } | null;
    sending_ally?: { full_name: string; specialty: string } | null;
    receiving_clinic?: { name: string } | null;
    receiving_ally?: { full_name: string; specialty: string } | null;
};

export type PopulatedReferralConsentRequest = ReferralConsentRequest & {
    clinics?: { name: string } | null; // Sending clinic
    receiving_ally?: { full_name: string; specialty: string } | null;
    receiving_clinic?: { name: string } | null;
}

export type CareTeamMemberProfile = CareTeam & {
    team_members_with_profiles: TeamMember | null;
};

export type InternalNoteWithAuthor = InternalNote & {
    team_members_with_profiles: TeamMember | null;
};

export type DietPlanHistoryItem = Database['public']['Tables']['diet_plan_history']['Row'] & {
    goals: any;
    totals: any;
    portions: any;
};

export type AffiliateProgram = Database['public']['Tables']['affiliate_programs']['Row'];
export type AffiliateLink = Database['public']['Tables']['affiliate_links']['Row'];
export type AffiliateEvent = Database['public']['Tables']['affiliate_events']['Row'];

export type PopulatedAffiliateLink = AffiliateLink & {
    affiliate_programs?: AffiliateProgram | null;
};

export type PopulatedAffiliateEvent = AffiliateEvent & {
    clinics?: { name: string } | null; // Referred clinic name
};

export type FiscalCredentials = Database['public']['Tables']['fiscal_credentials']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];

export type PopulatedPayment = Payment & {
    persons?: { full_name: string; rfc?: string | null; fiscal_address?: string | null; fiscal_regime?: string | null } | null;
    services?: { name: string } | null;
    invoices?: Invoice[]; // Array due to left join, usually 0 or 1
    recorded_by_name?: string;
}

// Feedback types
export type ChurnFeedback = Database['public']['Tables']['churn_feedback']['Row'] & {
    persons?: { full_name: string; clinic_id: string } | null;
};

// Clinical Reference Types
export type ClinicalReferenceContentItem = {
    label: string;
    value: string;
    key?: string;
    check?: 'high' | 'low';
    threshold?: number | number[];
};

export type ClinicalReference = Database['public']['Tables']['clinical_references']['Row'] & {
    content: ClinicalReferenceContentItem[] | Json;
};

// Patient Groups & Subscriptions Types
export type SharedSubscription = Database['public']['Tables']['shared_subscriptions']['Row'] & {
    patient_service_plans?: PatientServicePlan | null;
};

export type PopulatedPatientGroup = Database['public']['Tables']['patient_groups']['Row'] & {
    persons: { id: string; full_name: string }[];
    shared_subscriptions?: SharedSubscription[];
};

// Plan Templates Types
export type DietDayTemplate = {
    dia: string;
    desayuno: string;
    colacion_1: string;
    comida: string;
    colacion_2: string;
    cena: string;
};

export type Exercise = {
    nombre: string;
    series: string;
    repeticiones: string;
    descanso: string;
};

export type ExerciseDayTemplate = {
    dia: string;
    enfoque: string;
    ejercicios: Exercise[];
};
