import { Database } from './database.types';

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
export type CareTeam = Database['public']['Tables']['care_team']['Row'];
export type InternalNote = Database['public']['Tables']['internal_notes']['Row'];
// Add GamificationLog type
export type GamificationLog = Database['public']['Tables']['gamification_log']['Row'];
export type BetaFeedback = Database['public']['Tables']['beta_feedback']['Row'];


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

// --- AI Agent & WhatsApp Types ---
export type AiAgent = Database['public']['Tables']['ai_agents']['Row'] & {
    use_knowledge_base?: boolean;
    tools?: {
        get_patient_details?: { enabled: boolean };
        get_my_data_for_ai?: { enabled: boolean };
        get_available_slots?: { enabled: boolean };
        book_appointment?: { enabled: boolean };
    } | null;
    patient_system_prompt?: string | null;
    is_patient_portal_agent_active?: boolean;
    provider_api_key?: string | null;
};
export type WhatsappConnection = Database['public']['Tables']['whatsapp_connections']['Row'];
export type WhatsappContact = Database['public']['Tables']['whatsapp_contacts']['Row'] & {
    person_id?: string | null;
    person_name?: string | null;
};
export type WhatsappMessage = Database['public']['Tables']['whatsapp_conversations']['Row'];


// --- Calculator & Plan History Types ---
export interface DietPlanHistoryItem {
    id: string;
    clinic_id: string;
    person_id: string | null;
    person_name: string | null;
    plan_date: string;
    goals: any; // Json
    totals: any; // Json
    portions: any; // Json
    created_at: string;
}

// --- Clinical References Types ---
export type ClinicalReferenceContentItem = {
    label: string;
    value: string;
    key?: string; // Maps to a field in lab_results or consultations
    check?: 'high' | 'low'; // 'high' means value is bad if >= threshold
    threshold?: number | number[];
};

export type ClinicalReference = Omit<Database['public']['Tables']['clinical_references']['Row'], 'content'> & {
    content: ClinicalReferenceContentItem[] | null;
};

// --- Invoicing & Financial Types ---
export type FiscalCredentials = Database['public']['Tables']['fiscal_credentials']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];

// --- Zegna Affiliate Program Types (System A) ---
export type AffiliateProgram = Database['public']['Tables']['affiliate_programs']['Row'];
export type AffiliateLink = Database['public']['Tables']['affiliate_links']['Row'];
export type AffiliateEvent = Database['public']['Tables']['affiliate_events']['Row'];
export type PopulatedAffiliateLink = AffiliateLink & {
  affiliate_programs: AffiliateProgram | null;
};


// Decorated/Combined Types for UI convenience
export type ChurnFeedback = Database['public']['Tables']['churn_feedback']['Row'] & { persons: { full_name: string } | null };
export type ConsultationWithLabs = Consultation & { lab_results: LabResult[] };

export type LogWithPerson = Log & { persons: { full_name: string, person_type: string } | null };

export type CareTeamMemberProfile = CareTeam & {
    team_members_with_profiles: TeamMember | null;
};
export type InternalNoteWithAuthor = InternalNote & {
    team_members_with_profiles: Pick<TeamMember, 'full_name' | 'avatar_url'> | null;
};
export type AppointmentWithPerson = Appointment & { 
    persons: Pick<Person, 'full_name' | 'avatar_url' | 'person_type'> | null;
    check_in_time?: string | null;
    consulting_room?: string | null;
};

export type PopulatedPartnership = ClinicAllyPartnership & {
    allies: Ally;
};

export type PopulatedAllyPartnership = AllyAllyPartnership & {
    requester: Ally;
    responder: Ally;
};

export type PopulatedClinicPartnership = ClinicClinicPartnership & {
    requester: Clinic;
    responder: Clinic;
};

export type PopulatedReferral = Referral & {
    sending_clinic?: Pick<Clinic, 'name' | 'id'> | null;
    receiving_clinic?: Pick<Clinic, 'name' | 'id'> | null;
    sending_ally?: Pick<Ally, 'full_name' | 'specialty'> | null;
    receiving_ally?: Pick<Ally, 'full_name' | 'specialty'> | null;
    persons?: Person | null;
};

// FIX: Add PopulatedReferralConsentRequest type
export type PopulatedReferralConsentRequest = ReferralConsentRequest & {
    receiving_ally?: Pick<Ally, 'full_name' | 'specialty'> | null;
    receiving_clinic?: Pick<Clinic, 'name'> | null;
    persons?: Pick<Person, 'full_name'> | null;
    clinics?: Pick<Clinic, 'name'> | null;
};

export type PopulatedPayment = Payment & {
    persons: Pick<Person, 'full_name' | 'rfc' | 'fiscal_address' | 'fiscal_regime'> | null;
    services: Pick<Service, 'name'> | null;
    recorded_by_name: string | null;
    invoices: Invoice[]; // A reverse join will return an array
};

export type PopulatedAffiliateEvent = AffiliateEvent & {
  clinics: {
    name: string | null;
  } | null;
};

export type PopulatedPatientGroup = Database['public']['Tables']['patient_groups']['Row'] & {
    persons: Pick<Person, 'id' | 'full_name'>[];
    shared_subscriptions: (SharedSubscription & {
        patient_service_plans: PatientServicePlan | null;
    })[] | null;
};
export type SharedSubscription = Database['public']['Tables']['shared_subscriptions']['Row'];


// FIX: Add aliases for deprecated types to maintain compatibility during refactor
export type Client = Person;
export type Afiliado = Person;
export type PatientLog = Log;
export type AfiliadoLog = Log;
export type PatientLogWithClient = LogWithPerson;
export type PatientAllergy = Allergy;
export type PatientMedicalHistory = MedicalHistory;
export type PatientMedication = Medication;
export type PatientLifestyleHabits = LifestyleHabits;
export type PatientDailyCheckin = DailyCheckin;
export type PatientFile = File;
export type PatientCareTeamMemberProfile = CareTeamMemberProfile;
export type InternalPatientNoteWithAuthor = InternalNoteWithAuthor;
export type PatientCareTeam = CareTeam;
export type InternalPatientNote = InternalNote;
export type AfiliadoConsultationWithLabs = ConsultationWithLabs;
export type AfiliadoLabResult = LabResult;


// --- Plan Template Builder Types ---
export interface Exercise {
    nombre: string;
    series: string;
    repeticiones: string;
    descanso: string;
}

export interface DietDayTemplate {
    dia: string;
    desayuno: string;
    colacion_1: string;
    comida: string;
    colacion_2: string;
    cena: string;
}

export interface ExerciseDayTemplate {
    dia: string;
    enfoque: string;
    ejercicios: Exercise[];
}