export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          api_key: string | null
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean
          is_patient_portal_agent_active: boolean | null
          model_name: string
          model_provider: string
          name: string
          patient_system_prompt: string | null
          provider_api_key: string | null
          system_prompt: string
          tools: Json | null
          updated_at: string | null
          use_knowledge_base: boolean | null
        }
        Insert: {
          api_key?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_patient_portal_agent_active?: boolean | null
          model_name?: string
          model_provider?: string
          name?: string
          patient_system_prompt?: string | null
          provider_api_key?: string | null
          system_prompt: string
          tools?: Json | null
          updated_at?: string | null
          use_knowledge_base?: boolean | null
        }
        Update: {
          api_key?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_patient_portal_agent_active?: boolean | null
          model_name?: string
          model_provider?: string
          name?: string
          patient_system_prompt?: string | null
          provider_api_key?: string | null
          system_prompt?: string
          tools?: Json | null
          updated_at?: string | null
          use_knowledge_base?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      allergies_intolerances: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          person_id: string
          severity: string | null
          substance: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          person_id: string
          severity?: string | null
          substance: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          severity?: string | null
          substance?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_intolerances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      allies: {
        Row: {
          avatar_url: string | null
          biography: string | null
          contact_email: string | null
          created_at: string
          full_name: string
          id: string
          office_address: string | null
          phone_number: string | null
          specialty: string
          theme: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          contact_email?: string | null
          created_at?: string
          full_name: string
          id?: string
          office_address?: string | null
          phone_number?: string | null
          specialty: string
          theme?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          contact_email?: string | null
          created_at?: string
          full_name?: string
          id?: string
          office_address?: string | null
          phone_number?: string | null
          specialty?: string
          theme?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      ally_ally_partnerships: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          responder_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          responder_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          responder_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ally_ally_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ally_ally_partnerships_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          check_in_time: string | null
          clinic_id: string
          consulting_room: string | null
          created_at: string
          created_by_agent: boolean | null
          end_time: string
          id: string
          notes: string | null
          person_id: string | null
          start_time: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          check_in_time?: string | null
          clinic_id: string
          consulting_room?: string | null
          created_at?: string
          created_by_agent?: boolean | null
          end_time: string
          id?: string
          notes?: string | null
          person_id?: string | null
          start_time: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          check_in_time?: string | null
          clinic_id?: string
          consulting_room?: string | null
          created_at?: string
          created_by_agent?: boolean | null
          end_time?: string
          id?: string
          notes?: string | null
          person_id?: string | null
          start_time?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      care_team: {
        Row: {
          created_at: string | null
          id: string
          person_id: string
          role_in_team: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          person_id: string
          role_in_team?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          person_id?: string
          role_in_team?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_team_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_feedback: {
        Row: {
          created_at: string | null
          feedback_date: string | null
          id: string
          notes: string | null
          person_id: string
          reason: string
        }
        Insert: {
          created_at?: string | null
          feedback_date?: string | null
          id?: string
          notes?: string | null
          person_id: string
          reason: string
        }
        Update: {
          created_at?: string | null
          feedback_date?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_feedback_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_ally_partnerships: {
        Row: {
          ally_id: string
          clinic_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          ally_id: string
          clinic_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          ally_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_ally_partnerships_ally_id_fkey"
            columns: ["ally_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_ally_partnerships_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_clinic_partnerships: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          responder_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          responder_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          responder_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_clinic_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_clinic_partnerships_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          clinic_id: string
          created_at: string
          current_period_end: string
          id: string
          mercadopago_plan_id: string | null
          mercadopago_subscription_id: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          current_period_end: string
          id?: string
          mercadopago_plan_id?: string | null
          mercadopago_subscription_id?: string | null
          plan_id: string
          status: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          current_period_end?: string
          id?: string
          mercadopago_plan_id?: string | null
          mercadopago_subscription_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_references: {
        Row: {
          category: string
          clinic_id: string | null
          content: Json
          created_at: string
          icon_svg: string | null
          id: string
          linked_tool: string | null
          source: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          category: string
          clinic_id?: string | null
          content: Json
          created_at?: string
          icon_svg?: string | null
          id?: string
          linked_tool?: string | null
          source?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string
          clinic_id?: string | null
          content?: Json
          created_at?: string
          icon_svg?: string | null
          id?: string
          linked_tool?: string | null
          source?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_references_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          fiscal_regime: string | null
          id: string
          logo_url: string | null
          name: string
          operating_days: number[] | null
          operating_hours_end: string | null
          operating_hours_start: string | null
          operating_schedule: Json | null
          owner_id: string
          phone_number: string | null
          rfc: string | null
          theme: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          fiscal_regime?: string | null
          id?: string
          logo_url?: string | null
          name: string
          operating_days?: number[] | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          operating_schedule?: Json | null
          owner_id: string
          phone_number?: string | null
          rfc?: string | null
          theme?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          fiscal_regime?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          operating_days?: number[] | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          operating_schedule?: Json | null
          owner_id?: string
          phone_number?: string | null
          rfc?: string | null
          theme?: string | null
          website?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          consultation_date: string
          created_at: string
          height_cm: number | null
          id: string
          imc: number | null
          notes: string | null
          nutritionist_id: string | null
          person_id: string
          ta: string | null
          weight_kg: number | null
        }
        Insert: {
          consultation_date: string
          created_at?: string
          height_cm?: number | null
          id?: string
          imc?: number | null
          notes?: string | null
          nutritionist_id?: string | null
          person_id: string
          ta?: string | null
          weight_kg?: number | null
        }
        Update: {
          consultation_date?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          imc?: number | null
          notes?: string | null
          nutritionist_id?: string | null
          person_id?: string
          ta?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          attachments: Json | null
          checkin_date: string
          created_at: string | null
          energy_level_rating: number | null
          id: string
          mood_rating: number | null
          notes: string | null
          person_id: string
        }
        Insert: {
          attachments?: Json | null
          checkin_date: string
          created_at?: string | null
          energy_level_rating?: number | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          person_id: string
        }
        Update: {
          attachments?: Json | null
          checkin_date?: string
          created_at?: string | null
          energy_level_rating?: number | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_logs: {
        Row: {
          cena: string | null
          colacion_1: string | null
          colacion_2: string | null
          comida: string | null
          completed: boolean | null
          created_at: string
          created_by_user_id: string | null
          desayuno: string | null
          id: string
          log_date: string
          person_id: string
        }
        Insert: {
          cena?: string | null
          colacion_1?: string | null
          colacion_2?: string | null
          comida?: string | null
          completed?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          desayuno?: string | null
          id?: string
          log_date: string
          person_id: string
        }
        Update: {
          cena?: string | null
          colacion_1?: string | null
          colacion_2?: string | null
          comida?: string | null
          completed?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          desayuno?: string | null
          id?: string
          log_date?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_history: {
        Row: {
          clinic_id: string
          created_at: string
          goals: Json | null
          id: string
          person_id: string | null
          person_name: string | null
          plan_date: string
          portions: Json | null
          totals: Json | null
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          goals?: Json | null
          id?: string
          person_id?: string | null
          person_name?: string | null
          plan_date?: string
          portions?: Json | null
          totals?: Json | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          goals?: Json | null
          id?: string
          person_id?: string | null
          person_name?: string | null
          plan_date?: string
          portions?: Json | null
          totals?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_plan_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          completed: boolean | null
          created_at: string
          created_by_user_id: string | null
          dia: string | null
          ejercicios: Json | null
          enfoque: string | null
          id: string
          log_date: string
          person_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          dia?: string | null
          ejercicios?: Json | null
          enfoque?: string | null
          id?: string
          log_date: string
          person_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          dia?: string | null
          ejercicios?: Json | null
          enfoque?: string | null
          id?: string
          log_date?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          person_id: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          person_id: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          person_id?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_credentials: {
        Row: {
          certificate_path: string | null
          clinic_id: string
          created_at: string
          environment: string
          fiscal_api_key: string | null
          fiscal_person_id: string | null
          id: string
          private_key_password: string | null
          private_key_path: string | null
          updated_at: string
        }
        Insert: {
          certificate_path?: string | null
          clinic_id: string
          created_at?: string
          environment?: string
          fiscal_api_key?: string | null
          fiscal_person_id?: string | null
          id?: string
          private_key_password?: string | null
          private_key_path?: string | null
          updated_at?: string
        }
        Update: {
          certificate_path?: string | null
          clinic_id?: string
          created_at?: string
          environment?: string
          fiscal_api_key?: string | null
          fiscal_person_id?: string | null
          id?: string
          private_key_password?: string | null
          private_key_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_credentials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      food_equivalents: {
        Row: {
          carb_g: number
          clinic_id: string | null
          group_name: string
          id: string
          kcal: number
          lipid_g: number
          protein_g: number
          subgroup_name: string
          user_id: string | null
        }
        Insert: {
          carb_g: number
          clinic_id?: string | null
          group_name: string
          id?: string
          kcal: number
          lipid_g: number
          protein_g: number
          subgroup_name: string
          user_id?: string | null
        }
        Update: {
          carb_g?: number
          clinic_id?: string | null
          group_name?: string
          id?: string
          kcal?: number
          lipid_g?: number
          protein_g?: number
          subgroup_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_equivalents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_log: {
        Row: {
          created_at: string
          id: string
          person_id: string
          points_awarded: number
          reason: string
          related_appointment_id: string | null
          related_log_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          points_awarded: number
          reason: string
          related_appointment_id?: string | null
          related_log_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          points_awarded?: number
          reason?: string
          related_appointment_id?: string | null
          related_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gamification_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          created_at: string | null
          id: string
          mentions: string[] | null
          note: string
          person_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          note: string
          person_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          note?: string
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          id: string
          invited_by_user_id: string
          role: string
          status: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          id?: string
          invited_by_user_id: string
          role: string
          status?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by_user_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          clinic_id: string
          created_at: string
          error_message: string | null
          fiscal_uuid: string | null
          id: string
          payment_id: string
          pdf_url: string | null
          status: string | null
          xml_url: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          error_message?: string | null
          fiscal_uuid?: string | null
          id?: string
          payment_id: string
          pdf_url?: string | null
          status?: string | null
          xml_url?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          error_message?: string | null
          fiscal_uuid?: string | null
          id?: string
          payment_id?: string
          pdf_url?: string | null
          status?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_resources: {
        Row: {
          clinic_id: string
          content: string | null
          created_at: string | null
          file_url: string | null
          id: string
          tags: string[] | null
          title: string
          type: string
        }
        Insert: {
          clinic_id: string
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          tags?: string[] | null
          title: string
          type: string
        }
        Update: {
          clinic_id?: string
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_resources_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          cholesterol_mg_dl: number | null
          consultation_id: string
          created_at: string
          glucose_mg_dl: number | null
          hba1c: number | null
          id: string
          triglycerides_mg_dl: number | null
        }
        Insert: {
          cholesterol_mg_dl?: number | null
          consultation_id: string
          created_at?: string
          glucose_mg_dl?: number | null
          hba1c?: number | null
          id?: string
          triglycerides_mg_dl?: number | null
        }
        Update: {
          cholesterol_mg_dl?: number | null
          consultation_id?: string
          created_at?: string
          glucose_mg_dl?: number | null
          hba1c?: number | null
          id?: string
          triglycerides_mg_dl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      lifestyle_habits: {
        Row: {
          alcohol_frequency: string | null
          id: string
          person_id: string
          sleep_hours_avg: number | null
          smokes: boolean | null
          stress_level: number | null
          updated_at: string | null
          updated_by_user_id: string | null
          water_intake_liters_avg: number | null
        }
        Insert: {
          alcohol_frequency?: string | null
          id?: string
          person_id: string
          sleep_hours_avg?: number | null
          smokes?: boolean | null
          stress_level?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          water_intake_liters_avg?: number | null
        }
        Update: {
          alcohol_frequency?: string | null
          id?: string
          person_id?: string
          sleep_hours_avg?: number | null
          smokes?: boolean | null
          stress_level?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          water_intake_liters_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifestyle_habits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by_user_id: string | null
          description: string
          id: string
          log_time: string | null
          log_type: string
          person_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          description: string
          id?: string
          log_time?: string | null
          log_type: string
          person_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          id?: string
          log_time?: string | null
          log_type?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_analysis_logs: {
        Row: {
          ai_analysis: string | null
          created_at: string
          id: string
          image_url: string
          meal_type: string | null
          person_id: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string
          id?: string
          image_url: string
          meal_type?: string | null
          person_id: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string
          id?: string
          image_url?: string
          meal_type?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_analysis_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_history: {
        Row: {
          condition: string
          created_at: string | null
          created_by_user_id: string | null
          diagnosis_date: string | null
          id: string
          notes: string | null
          person_id: string
        }
        Insert: {
          condition: string
          created_at?: string | null
          created_by_user_id?: string | null
          diagnosis_date?: string | null
          id?: string
          notes?: string | null
          person_id: string
        }
        Update: {
          condition?: string
          created_at?: string | null
          created_by_user_id?: string | null
          diagnosis_date?: string | null
          id?: string
          notes?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          dosage: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          person_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          person_id: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      nutritionist_profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          consulting_room: string | null
          contact_phone: string | null
          created_at: string
          full_name: string | null
          license_number: string | null
          office_address: string | null
          professional_title: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          consulting_room?: string | null
          contact_phone?: string | null
          created_at?: string
          full_name?: string | null
          license_number?: string | null
          office_address?: string | null
          professional_title?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          consulting_room?: string | null
          contact_phone?: string | null
          created_at?: string
          full_name?: string | null
          license_number?: string | null
          office_address?: string | null
          professional_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_invitations: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          person_id: string
          status: string
          token: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          person_id: string
          status?: string
          token: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          person_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_invitations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_service_plans: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean
          max_consultations: number | null
          name: string
          price: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          duration_days: number
          features?: Json | null
          id?: string
          is_active?: boolean
          max_consultations?: number | null
          name: string
          price?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          max_consultations?: number | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_service_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          person_id: string | null
          recorded_by_user_id: string | null
          service_id: string | null
          status: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method: string
          person_id?: string | null
          recorded_by_user_id?: string | null
          service_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          person_id?: string | null
          recorded_by_user_id?: string | null
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          clinic_id: string
          consent_file_url: string | null
          consent_given_at: string | null
          created_at: string
          created_by_user_id: string | null
          curp: string | null
          current_plan_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          family_history: string | null
          fiscal_address: string | null
          fiscal_regime: string | null
          folio: string | null
          full_name: string
          gamification_points: number
          gamification_rank: string
          gender: string | null
          health_goal: string | null
          id: string
          normalized_name: string | null
          normalized_phone_number: string | null
          notes: string | null
          person_type: string
          phone_number: string | null
          rfc: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          clinic_id: string
          consent_file_url?: string | null
          consent_given_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          curp?: string | null
          current_plan_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_history?: string | null
          fiscal_address?: string | null
          fiscal_regime?: string | null
          folio?: string | null
          full_name: string
          gamification_points?: number
          gamification_rank?: string
          gender?: string | null
          health_goal?: string | null
          id?: string
          normalized_name?: string | null
          normalized_phone_number?: string | null
          notes?: string | null
          person_type: string
          phone_number?: string | null
          rfc?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          clinic_id?: string
          consent_file_url?: string | null
          consent_given_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          curp?: string | null
          current_plan_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_history?: string | null
          fiscal_address?: string | null
          fiscal_regime?: string | null
          folio?: string | null
          full_name?: string
          gamification_points?: number
          gamification_rank?: string
          gender?: string | null
          health_goal?: string | null
          id?: string
          normalized_name?: string | null
          normalized_phone_number?: string | null
          notes?: string | null
          person_type?: string
          phone_number?: string | null
          rfc?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "patient_service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          clinic_id: string
          created_at: string | null
          description: string | null
          id: string
          template_data: Json | null
          title: string
          type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          template_data?: Json | null
          title: string
          type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          template_data?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_professionals: number
          name: string
          price_monthly: number
          price_yearly: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_professionals?: number
          name: string
          price_monthly: number
          price_yearly: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_professionals?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription_object: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription_object: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription_object?: Json
          user_id?: string
        }
        Relationships: []
      }
      queue_displays: {
        Row: {
          calling_label: string
          clinic_id: string
          config: Json | null
          created_at: string
          display_code: string
          id: string
          name: string
        }
        Insert: {
          calling_label?: string
          clinic_id: string
          config?: Json | null
          created_at?: string
          display_code: string
          id?: string
          name: string
        }
        Update: {
          calling_label?: string
          clinic_id?: string
          config?: Json | null
          created_at?: string
          display_code?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_displays_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_consent_requests: {
        Row: {
          clinic_id: string
          created_at: string
          created_by_user_id: string
          id: string
          notes: string | null
          patient_info: Json | null
          person_id: string
          receiving_ally_id: string | null
          receiving_clinic_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          notes?: string | null
          patient_info?: Json | null
          person_id: string
          receiving_ally_id?: string | null
          receiving_clinic_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          notes?: string | null
          patient_info?: Json | null
          person_id?: string
          receiving_ally_id?: string | null
          receiving_clinic_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_consent_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_consent_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_consent_requests_receiving_ally_id_fkey"
            columns: ["receiving_ally_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_consent_requests_receiving_clinic_id_fkey"
            columns: ["receiving_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_info: Json
          person_id: string | null
          receiving_ally_id: string | null
          receiving_clinic_id: string | null
          sending_ally_id: string | null
          sending_clinic_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_info: Json
          person_id?: string | null
          receiving_ally_id?: string | null
          receiving_clinic_id?: string | null
          sending_ally_id?: string | null
          sending_clinic_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_info?: Json
          person_id?: string | null
          receiving_ally_id?: string | null
          receiving_clinic_id?: string | null
          sending_ally_id?: string | null
          sending_clinic_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_receiving_ally_id_fkey"
            columns: ["receiving_ally_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_receiving_clinic_id_fkey"
            columns: ["receiving_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_sending_ally_id_fkey"
            columns: ["sending_ally_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_sending_clinic_id_fkey"
            columns: ["sending_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          clinic_id: string
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean
          phone_number: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          credentials: Json
          id?: string
          is_active?: boolean
          phone_number: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean
          phone_number?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          ai_is_active: boolean
          clinic_id: string
          created_at: string
          id: string
          last_message_at: string | null
          person_id: string | null
          person_name: string | null
          phone_number: string
        }
        Insert: {
          ai_is_active?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          person_id?: string | null
          person_name?: string | null
          phone_number: string
        }
        Update: {
          ai_is_active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          person_id?: string | null
          person_name?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          clinic_id: string
          contact_id: string | null
          contact_phone_number: string
          id: number
          message_content: string
          sender: string
          sent_at: string | null
        }
        Insert: {
          clinic_id: string
          contact_id?: string | null
          contact_phone_number: string
          id?: number
          message_content: string
          sender: string
          sent_at?: string | null
        }
        Update: {
          clinic_id?: string
          contact_id?: string | null
          contact_phone_number?: string
          id?: number
          message_content?: string
          sender?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_queue: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          messages: string[]
          process_at: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          messages: string[]
          process_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          messages?: string[]
          process_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_members_with_profiles: {
        Row: {
          avatar_url: string | null
          clinic_id: string | null
          consulting_room: string | null
          full_name: string | null
          joined_at: string | null
          owner_id: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_referral_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      award_daily_checkin_points: {
        Args: { p_checkin_id: string; p_person_id: string }
        Returns: undefined
      }
      award_points_for_completed_plan: {
        Args: { p_log_id: string; p_log_type: string }
        Returns: undefined
      }
      award_points_for_consultation_attendance: {
        Args: { p_appointment_id: string; p_person_id: string }
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      book_appointment: {
        Args: {
          p_clinic_id: string
          p_notes?: string
          p_patient_query?: string
          p_person_id?: string
          p_start_time: string
        }
        Returns: string
      }
      create_initial_clinic: {
        Args: {
          address?: string
          email?: string
          name: string
          phone_number?: string
          website?: string
        }
        Returns: {
          address: string | null
          created_at: string
          email: string | null
          fiscal_regime: string | null
          id: string
          logo_url: string | null
          name: string
          operating_days: number[] | null
          operating_hours_end: string | null
          operating_hours_start: string | null
          operating_schedule: Json | null
          owner_id: string
          phone_number: string | null
          rfc: string | null
          theme: string | null
          website: string | null
        }
      }
      from_binary: {
        Args: { "": string } | { "": unknown }
        Returns: string
      }
      get_ally_id_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_slots: {
        Args: { p_clinic_id: string; p_target_date: string }
        Returns: string[]
      }
      get_my_data_for_ai: {
        Args: { day_offset: number; p_person_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_id_to_check: string }
        Returns: string
      }
      half_binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      half_sparse_binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      invite_ally_to_clinic: {
        Args: {
          p_clinic_id: string
          p_contact_email: string
          p_full_name: string
          p_phone_number?: string
          p_specialty: string
        }
        Returns: undefined
      }
      is_clinic_admin: {
        Args: { clinic_id_to_check: string }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { clinic_id_to_check: string }
        Returns: boolean
      }
      is_part_of_ally_partnership: {
        Args: { partnership_id_to_check: string }
        Returns: boolean
      }
      ivfflat_handler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_distance: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }[]
      }
      max_inner_product: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      reject_referral_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_ally_partnership: {
        Args: { p_responder_id: string }
        Returns: undefined
      }
      request_clinic_partnership: {
        Args: { p_responder_clinic_id: string }
        Returns: undefined
      }
      request_partnership_from_ally: {
        Args: { p_clinic_id: string }
        Returns: undefined
      }
      request_partnership_with_ally: {
        Args: { p_ally_id: string; p_clinic_id: string }
        Returns: undefined
      }
      send_referral_from_ally_to_ally: {
        Args: { p_notes: string; p_patient_info: Json; p_receiving_ally_id: string }
        Returns: string
      }
      send_referral_from_ally_to_clinic: {
        Args: {
          p_notes: string
          p_patient_info: Json
          p_receiving_clinic_id: string
        }
        Returns: string
      }
      send_referral_from_clinic_to_clinic: {
        Args: {
          p_notes: string
          p_patient_info: Json
          p_person_id?: string
          p_receiving_clinic_id: string
        }
        Returns: string
      }
      send_referral_to_ally: {
        Args: {
          p_clinic_id: string
          p_notes: string
          p_patient_info: Json
          p_person_id?: string
          p_receiving_ally_id: string
        }
        Returns: string
      }
      sparse_binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      to_binary: {
        Args: { "": string } | { "": unknown }
        Returns: string
      }
      update_ally_partnership_status: {
        Args: { p_new_status: string; p_partnership_id: string }
        Returns: undefined
      }
      update_clinic_partnership_status: {
        Args: { p_new_status: string; p_partnership_id: string }
        Returns: undefined
      }
      update_partnership_status: {
        Args: { p_new_status: string; p_partnership_id: string }
        Returns: undefined
      }
      update_partnership_status_as_ally: {
        Args: { p_new_status: string; p_partnership_id: string }
        Returns: undefined
      }
      update_referral_status: {
        Args: { p_clinic_id: string; p_new_status: string; p_referral_id: string }
        Returns: undefined
      }
      update_referral_status_as_ally: {
        Args: { p_new_status: string; p_referral_id: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": unknown[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_out: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string } | { "": unknown }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never