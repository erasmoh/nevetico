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
      api_keys: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      automations: {
        Row: {
          calendar_id: string
          config: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          name: string
          steps: Json
          trigger: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          name: string
          steps?: Json
          trigger: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          name?: string
          steps?: Json
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_members: {
        Row: {
          calendar_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          cover_url: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          theme: Json
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          email: string
          event_id: string
          id: string
          issued_at: string
          issued_by: string | null
          name: string | null
          registration_id: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          email: string
          event_id: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          name?: string | null
          registration_id?: string | null
          token?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          event_id?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          name?: string | null
          registration_id?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_proposals: {
        Row: {
          abstract: string
          created_at: string
          duration_minutes: number | null
          event_id: string
          format: string | null
          id: string
          speaker_bio: string | null
          speaker_email: string
          speaker_link: string | null
          speaker_name: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          abstract: string
          created_at?: string
          duration_minutes?: number | null
          event_id: string
          format?: string | null
          id?: string
          speaker_bio?: string | null
          speaker_email: string
          speaker_link?: string | null
          speaker_name: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string
          created_at?: string
          duration_minutes?: number | null
          event_id?: string
          format?: string | null
          id?: string
          speaker_bio?: string | null
          speaker_email?: string
          speaker_link?: string | null
          speaker_name?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_proposals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_votes: {
        Row: {
          created_at: string
          email: string
          id: string
          proposal_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          proposal_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          proposal_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfp_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "cfp_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_by: string | null
          checked_in_at: string
          event_id: string
          id: string
          registration_id: string
        }
        Insert: {
          checked_by?: string | null
          checked_in_at?: string
          event_id: string
          id?: string
          registration_id: string
        }
        Update: {
          checked_by?: string | null
          checked_in_at?: string
          event_id?: string
          id?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          blocks: Json
          calendar_id: string
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          name: string
          preheader: string | null
          recipient_count: number
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          calendar_id: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          name: string
          preheader?: string | null
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          name?: string
          preheader?: string | null
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          calendar_id: string | null
          campaign_id: string | null
          event_type: string
          id: string
          meta: Json
          occurred_at: string
          queue_id: string | null
          url: string | null
        }
        Insert: {
          calendar_id?: string | null
          campaign_id?: string | null
          event_type: string
          id?: string
          meta?: Json
          occurred_at?: string
          queue_id?: string | null
          url?: string | null
        }
        Update: {
          calendar_id?: string | null
          campaign_id?: string | null
          event_type?: string
          id?: string
          meta?: Json
          occurred_at?: string
          queue_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          automation_id: string | null
          calendar_id: string | null
          campaign_id: string | null
          context: Json
          created_at: string
          event_id: string | null
          id: string
          last_error: string | null
          message_id: string | null
          payload: Json
          registration_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          attempts?: number
          automation_id?: string | null
          calendar_id?: string | null
          campaign_id?: string | null
          context?: Json
          created_at?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          message_id?: string | null
          payload?: Json
          registration_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
          template: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          attempts?: number
          automation_id?: string | null
          calendar_id?: string | null
          campaign_id?: string | null
          context?: Json
          created_at?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          message_id?: string | null
          payload?: Json
          registration_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribes: {
        Row: {
          calendar_id: string
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          calendar_id: string
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          calendar_id?: string
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          calendar_id: string | null
          capacity: number | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location_type: string
          max_attendees_override: number | null
          online_url: string | null
          slug: string
          starts_at: string
          status: string
          theme: Json
          timezone: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          calendar_id?: string | null
          capacity?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location_type?: string
          max_attendees_override?: number | null
          online_url?: string | null
          slug: string
          starts_at: string
          status?: string
          theme?: Json
          timezone?: string
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          calendar_id?: string | null
          capacity?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location_type?: string
          max_attendees_override?: number | null
          online_url?: string | null
          slug?: string
          starts_at?: string
          status?: string
          theme?: Json
          timezone?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          config: Json
          created_at: string
          event_id: string
          id: string
          order_idx: number
          type: string
          visible: boolean
        }
        Insert: {
          config?: Json
          created_at?: string
          event_id: string
          id?: string
          order_idx?: number
          type: string
          visible?: boolean
        }
        Update: {
          config?: Json
          created_at?: string
          event_id?: string
          id?: string
          order_idx?: number
          type?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          max_attendees_override: number | null
          plan: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_admin?: boolean
          max_attendees_override?: number | null
          plan?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          max_attendees_override?: number | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          answers: Json
          created_at: string
          email: string
          event_id: string
          id: string
          name: string | null
          status: string
          ticket_type_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          email: string
          event_id: string
          id?: string
          name?: string | null
          status?: string
          ticket_type_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string | null
          status?: string
          ticket_type_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          calendar_id: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_stats: {
        Row: {
          calendar_id: string | null
          clicks: number
          event_id: string
          id: string
          impressions: number
          link: string | null
          logo_url: string | null
          sponsor_name: string
          stat_date: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          clicks?: number
          event_id: string
          id?: string
          impressions?: number
          link?: string | null
          logo_url?: string | null
          sponsor_name: string
          stat_date?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          clicks?: number
          event_id?: string
          id?: string
          impressions?: number
          link?: string | null
          logo_url?: string | null
          sponsor_name?: string
          stat_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_stats_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string
          event_id: string
          id: string
          name: string
          order_idx: number
          price_cents: number
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          name?: string
          order_idx?: number
          price_cents?: number
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          name?: string
          order_idx?: number
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_domains: {
        Row: {
          calendar_id: string
          created_at: string
          domain: string
          id: string
          last_checked_at: string | null
          records: Json
          resend_id: string | null
          status: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          domain: string
          id?: string
          last_checked_at?: string | null
          records?: Json
          resend_id?: string | null
          status?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          domain?: string
          id?: string
          last_checked_at?: string | null
          records?: Json
          resend_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_domains_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          sent_at: string
          status_code: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          sent_at?: string
          status_code?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          sent_at?: string
          status_code?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          calendar_id: string
          created_at: string
          enabled: boolean
          events: Json
          id: string
          secret: string
          url: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          enabled?: boolean
          events?: Json
          id?: string
          secret?: string
          url: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          enabled?: boolean
          events?: Json
          id?: string
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_event_template: {
        Args: { p_blocks: Json; p_event_id: string }
        Returns: undefined
      }
      calendar_owner_plan: { Args: { p_cal_id: string }; Returns: string }
      create_calendar: {
        Args: { p_description?: string; p_name: string; p_slug: string }
        Returns: {
          cover_url: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          theme: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "calendars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_event: {
        Args: {
          p_address?: string
          p_calendar_id: string
          p_capacity?: number
          p_cover_url?: string
          p_description?: string
          p_ends_at?: string
          p_location_type?: string
          p_online_url?: string
          p_slug: string
          p_starts_at: string
          p_status?: string
          p_timezone?: string
          p_title: string
          p_venue_name?: string
        }
        Returns: {
          address: string | null
          calendar_id: string | null
          capacity: number | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location_type: string
          max_attendees_override: number | null
          online_url: string | null
          slug: string
          starts_at: string
          status: string
          theme: Json
          timezone: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      event_organizer_plan: { Args: { p_ev_id: string }; Returns: string }
      event_visible_to_current_user: {
        Args: { ev_id: string }
        Returns: boolean
      }
      is_calendar_member: {
        Args: { allowed_roles?: string[]; cal_id: string }
        Returns: boolean
      }
      is_event_organizer: { Args: { ev_id: string }; Returns: boolean }
      register_for_event: {
        Args: {
          p_email: string
          p_event_id: string
          p_name?: string
          p_user_id?: string
        }
        Returns: {
          answers: Json
          created_at: string
          email: string
          event_id: string
          id: string
          name: string | null
          status: string
          ticket_type_id: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_page_blocks: {
        Args: { p_event_id: string; p_ids: string[] }
        Returns: undefined
      }
      user_plan: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

