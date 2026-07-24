export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      association: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_association_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_association_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_association_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "association_parent_association_id_fkey"
            columns: ["parent_association_id"]
            isOneToOne: false
            referencedRelation: "association"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter: {
        Row: {
          accent_color: string | null
          association_id: string | null
          branding: Json
          created_at: string
          hero_text: string | null
          id: string
          logo_url: string | null
          name: string
          region: string | null
          slug: string | null
          state_association_id: string | null
          tagline: string | null
        }
        Insert: {
          accent_color?: string | null
          association_id?: string | null
          branding?: Json
          created_at?: string
          hero_text?: string | null
          id?: string
          logo_url?: string | null
          name: string
          region?: string | null
          slug?: string | null
          state_association_id?: string | null
          tagline?: string | null
        }
        Update: {
          accent_color?: string | null
          association_id?: string | null
          branding?: Json
          created_at?: string
          hero_text?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          region?: string | null
          slug?: string | null
          state_association_id?: string | null
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "association"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_state_association_id_fkey"
            columns: ["state_association_id"]
            isOneToOne: false
            referencedRelation: "association"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_module: {
        Row: {
          chapter_id: string
          config: Json
          enabled: boolean
          id: string
          module_key: string
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          config?: Json
          enabled?: boolean
          id?: string
          module_key: string
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          config?: Json
          enabled?: boolean
          id?: string
          module_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_module_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_module_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["key"]
          },
        ]
      }
      domain_event: {
        Row: {
          actor_id: string | null
          aggregate_id: string | null
          aggregate_type: string | null
          chapter_id: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          person_id: string | null
        }
        Insert: {
          actor_id?: string | null
          aggregate_id?: string | null
          aggregate_type?: string | null
          chapter_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          person_id?: string | null
        }
        Update: {
          actor_id?: string | null
          aggregate_id?: string | null
          aggregate_type?: string | null
          chapter_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_event_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_event_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_event_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_hold: {
        Row: {
          confirmed_by: string | null
          detected_at: string | null
          detected_batch: string | null
          id: string
          lifted_at: string | null
          person_id: string
          reason: string | null
          season_id: string | null
          source_org_id: string | null
          state: string
        }
        Insert: {
          confirmed_by?: string | null
          detected_at?: string | null
          detected_batch?: string | null
          id?: string
          lifted_at?: string | null
          person_id: string
          reason?: string | null
          season_id?: string | null
          source_org_id?: string | null
          state?: string
        }
        Update: {
          confirmed_by?: string | null
          detected_at?: string | null
          detected_batch?: string | null
          id?: string
          lifted_at?: string | null
          person_id?: string
          reason?: string | null
          season_id?: string | null
          source_org_id?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_hold_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_hold_detected_batch_fkey"
            columns: ["detected_batch"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_hold_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_hold_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_hold_source_org_id_fkey"
            columns: ["source_org_id"]
            isOneToOne: false
            referencedRelation: "association"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch: {
        Row: {
          chapter_id: string | null
          id: string
          is_full_roster: boolean
          matched: number | null
          new_confirmations: number | null
          row_count: number | null
          season_id: string | null
          source: string
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          id?: string
          is_full_roster?: boolean
          matched?: number | null
          new_confirmations?: number | null
          row_count?: number | null
          season_id?: string | null
          source?: string
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          id?: string
          is_full_roster?: boolean
          matched?: number | null
          new_confirmations?: number | null
          row_count?: number | null
          season_id?: string | null
          source?: string
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      import_row: {
        Row: {
          batch_id: string
          id: string
          match_method: string | null
          matched_person_id: string | null
          outcome: string | null
          raw: Json | null
        }
        Insert: {
          batch_id: string
          id?: string
          match_method?: string | null
          matched_person_id?: string | null
          outcome?: string | null
          raw?: Json | null
        }
        Update: {
          batch_id?: string
          id?: string
          match_method?: string | null
          matched_person_id?: string | null
          outcome?: string | null
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_row_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_row_matched_person_id_fkey"
            columns: ["matched_person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      lead: {
        Row: {
          chapter_id: string
          created_at: string
          dropoff_risk: string | null
          id: string
          person_id: string
          score: number | null
          source: string | null
          sport_id: string | null
          stage: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          dropoff_risk?: string | null
          id?: string
          person_id: string
          score?: number | null
          source?: string | null
          sport_id?: string | null
          stage?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          dropoff_risk?: string | null
          id?: string
          person_id?: string
          score?: number | null
          source?: string | null
          sport_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          chapter_id: string
          created_at: string
          division: string | null
          id: string
          joined_at: string | null
          person_id: string
          role: string
          sport_id: string | null
          status: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          division?: string | null
          id?: string
          joined_at?: string | null
          person_id: string
          role: string
          sport_id?: string | null
          status?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          division?: string | null
          id?: string
          joined_at?: string | null
          person_id?: string
          role?: string
          sport_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      module: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          name?: string
        }
        Relationships: []
      }
      payment: {
        Row: {
          amount: number
          chapter_id: string
          created_at: string | null
          currency: string
          id: string
          paid_at: string | null
          person_id: string
          provider: string
          provider_ref: string | null
          season_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          chapter_id: string
          created_at?: string | null
          currency?: string
          id?: string
          paid_at?: string | null
          person_id: string
          provider?: string
          provider_ref?: string | null
          season_id?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          chapter_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          paid_at?: string | null
          person_id?: string
          provider?: string
          provider_ref?: string | null
          season_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
        ]
      }
      person: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          home_location: string | null
          id: string
          phone: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_location?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_location?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      registration_cycle: {
        Row: {
          access_token: string
          chapter_id: string
          clearance_level: string
          cleared_at: string | null
          created_at: string
          id: string
          member_type: string | null
          person_id: string
          season_id: string
          sport_id: string
          status: string
          template_version_id: string | null
        }
        Insert: {
          access_token?: string
          chapter_id: string
          clearance_level?: string
          cleared_at?: string | null
          created_at?: string
          id?: string
          member_type?: string | null
          person_id: string
          season_id: string
          sport_id: string
          status?: string
          template_version_id?: string | null
        }
        Update: {
          access_token?: string
          chapter_id?: string
          clearance_level?: string
          cleared_at?: string | null
          created_at?: string
          id?: string
          member_type?: string | null
          person_id?: string
          season_id?: string
          sport_id?: string
          status?: string
          template_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_cycle_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_cycle_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_cycle_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_cycle_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_cycle_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_version"
            referencedColumns: ["id"]
          },
        ]
      }
      season: {
        Row: {
          association_id: string | null
          created_at: string
          ends_on: string | null
          id: string
          name: string
          sport_id: string | null
          starts_on: string | null
        }
        Insert: {
          association_id?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          sport_id?: string | null
          starts_on?: string | null
        }
        Update: {
          association_id?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          sport_id?: string | null
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "association"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      sport: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      step_completion: {
        Row: {
          attempts: number
          completed_at: string | null
          confirmed_at: string | null
          confirmed_via_batch: string | null
          created_at: string
          cycle_id: string
          data: Json
          due_at: string | null
          evidence_url: string | null
          external_ref: string | null
          id: string
          source: string | null
          status: string
          updated_at: string
          verified_by_person_id: string | null
          workflow_step_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_via_batch?: string | null
          created_at?: string
          cycle_id: string
          data?: Json
          due_at?: string | null
          evidence_url?: string | null
          external_ref?: string | null
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
          verified_by_person_id?: string | null
          workflow_step_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_via_batch?: string | null
          created_at?: string
          cycle_id?: string
          data?: Json
          due_at?: string | null
          evidence_url?: string | null
          external_ref?: string | null
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
          verified_by_person_id?: string | null
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_completion_confirmed_via_batch_fkey"
            columns: ["confirmed_via_batch"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_completion_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "registration_cycle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_completion_verified_by_person_id_fkey"
            columns: ["verified_by_person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_completion_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step"
            referencedColumns: ["id"]
          },
        ]
      }
      step_dependency: {
        Row: {
          depends_on_step_id: string
          gate_type: string
          id: string
          step_id: string
        }
        Insert: {
          depends_on_step_id: string
          gate_type?: string
          id?: string
          step_id: string
        }
        Update: {
          depends_on_step_id?: string
          gate_type?: string
          id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_dependency_depends_on_step_id_fkey"
            columns: ["depends_on_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_dependency_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event: {
        Row: {
          event_id: string
          id: string
          processed_at: string | null
          provider: string
          received_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          processed_at?: string | null
          provider: string
          received_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          processed_at?: string | null
          provider?: string
          received_at?: string | null
        }
        Relationships: []
      }
      workflow_step: {
        Row: {
          audience: Json | null
          authority: string
          blocks_progress: boolean | null
          cadence: string
          chapter_id: string
          completion_mode: string
          config: Json
          created_at: string
          deadline_offset_days: number | null
          fulfillment_config: Json | null
          fulfillment_type: string | null
          id: string
          is_locked: boolean | null
          name: string
          prerequisite_step_id: string | null
          required: boolean
          sort_key: string | null
          sort_order: number
          sport_id: string | null
          stable_key: string | null
          step_type: string
          version_id: string | null
        }
        Insert: {
          audience?: Json | null
          authority?: string
          blocks_progress?: boolean | null
          cadence?: string
          chapter_id: string
          completion_mode?: string
          config?: Json
          created_at?: string
          deadline_offset_days?: number | null
          fulfillment_config?: Json | null
          fulfillment_type?: string | null
          id?: string
          is_locked?: boolean | null
          name: string
          prerequisite_step_id?: string | null
          required?: boolean
          sort_key?: string | null
          sort_order: number
          sport_id?: string | null
          stable_key?: string | null
          step_type?: string
          version_id?: string | null
        }
        Update: {
          audience?: Json | null
          authority?: string
          blocks_progress?: boolean | null
          cadence?: string
          chapter_id?: string
          completion_mode?: string
          config?: Json
          created_at?: string
          deadline_offset_days?: number | null
          fulfillment_config?: Json | null
          fulfillment_type?: string | null
          id?: string
          is_locked?: boolean | null
          name?: string
          prerequisite_step_id?: string | null
          required?: boolean
          sort_key?: string | null
          sort_order?: number
          sport_id?: string | null
          stable_key?: string | null
          step_type?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_prerequisite_step_id_fkey"
            columns: ["prerequisite_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_version"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_template: {
        Row: {
          applies_to: string
          chapter_id: string
          created_at: string | null
          current_version_id: string | null
          id: string
          name: string
          sport_id: string | null
          status: string
        }
        Insert: {
          applies_to?: string
          chapter_id: string
          created_at?: string | null
          current_version_id?: string | null
          id?: string
          name: string
          sport_id?: string | null
          status?: string
        }
        Update: {
          applies_to?: string
          chapter_id?: string
          created_at?: string | null
          current_version_id?: string | null
          id?: string
          name?: string
          sport_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_template_version: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          state: string
          template_id: string
          version_no: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          state?: string
          template_id: string
          version_no: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          state?: string
          template_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_version_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_version_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_template"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_step: {
        Args: { p_data?: Json; p_step_id: string; p_token: string }
        Returns: Json
      }
      current_person_id: { Args: Record<PropertyKey, never>; Returns: string }
      current_user_chapter_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      get_registration: { Args: { p_token: string }; Returns: Json }
      mark_step_paid: {
        Args: { p_cycle_id: string; p_step_id: string; p_payment: Json }
        Returns: undefined
      }
      recompute_cycle_clearance: {
        Args: { p_cycle_id: string }
        Returns: undefined
      }
      start_registration: {
        Args: {
          p_chapter_id: string
          p_email: string
          p_member_type?: string
          p_season_id?: string
          p_sport_id: string
        }
        Returns: Json
      }
      submit_lead: {
        Args: {
          p_chapter_id: string
          p_email?: string
          p_full_name: string
          p_phone?: string
          p_source?: string
          p_sport_id?: string
        }
        Returns: string
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

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
