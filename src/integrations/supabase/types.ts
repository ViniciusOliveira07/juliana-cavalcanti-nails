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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          access_token: string
          cancelled_at: string | null
          client_id: string | null
          client_notes: string | null
          created_at: string
          created_by: string
          end_at: string
          final_price: number | null
          id: string
          payment_status: string
          profile_id: string
          service_id: string
          start_at: string
          status: string
        }
        Insert: {
          access_token?: string
          cancelled_at?: string | null
          client_id?: string | null
          client_notes?: string | null
          created_at?: string
          created_by?: string
          end_at: string
          final_price?: number | null
          id?: string
          payment_status?: string
          profile_id: string
          service_id: string
          start_at: string
          status?: string
        }
        Update: {
          access_token?: string
          cancelled_at?: string | null
          client_id?: string | null
          client_notes?: string | null
          created_at?: string
          created_by?: string
          end_at?: string
          final_price?: number | null
          id?: string
          payment_status?: string
          profile_id?: string
          service_id?: string
          start_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          active: boolean
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          name: string
          profile_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          profile_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          payment_method: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          description: string
          expense_date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          recipient_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          recipient_type: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          method: string
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brand_name: string | null
          buffer_minutes: number
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          buffer_minutes?: number
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_name?: string | null
          buffer_minutes?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          profile_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_minutes: number
          id?: string
          name: string
          price: number
          profile_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          created_at: string
          end_at: string
          id: string
          profile_id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          profile_id: string
          reason?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          active: boolean
          end_time: string
          id: string
          profile_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          end_time?: string
          id?: string
          profile_id: string
          start_time?: string
          weekday: number
        }
        Update: {
          active?: boolean
          end_time?: string
          id?: string
          profile_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_slots: {
        Args: { p_date: string; p_profile_id: string; p_service_id: string }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      get_expenses_by_category: {
        Args: { p_month: number; p_profile_id: string; p_year: number }
        Returns: {
          category_id: string
          count: number
          icon: string
          name: string
          total: number
        }[]
      }
      get_financial_summary: {
        Args: { p_month: number; p_profile_id: string; p_year: number }
        Returns: Json
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_revenue_by_method: {
        Args: { p_month: number; p_profile_id: string; p_year: number }
        Returns: {
          count: number
          method: string
          total: number
        }[]
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
