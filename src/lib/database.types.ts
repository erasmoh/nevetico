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
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
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
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          event_id: string | null
          id: string
          last_error: string | null
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
          created_at?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
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
          created_at?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
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
          online_url: string | null
          slug: string
          starts_at: string
          status: string
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
          online_url?: string | null
          slug: string
          starts_at: string
          status?: string
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
          online_url?: string | null
          slug?: string
          starts_at?: string
          status?: string
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
        }
        Insert: {
          config?: Json
          created_at?: string
          event_id: string
          id?: string
          order_idx?: number
          type: string
        }
        Update: {
          config?: Json
          created_at?: string
          event_id?: string
          id?: string
          order_idx?: number
          type?: string
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_calendar: {
        Args: { p_description?: string; p_name: string; p_slug: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
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
          online_url: string | null
          slug: string
          starts_at: string
          status: string
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

