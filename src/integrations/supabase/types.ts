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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          business_name: string
          currency: string
          id: number
          updated_at: string
        }
        Insert: {
          business_name?: string
          currency?: string
          id?: number
          updated_at?: string
        }
        Update: {
          business_name?: string
          currency?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          approved_qty: number
          bill_amount: number
          created_at: string
          customer_id: string
          delivered_qty: number
          delivery_date: string
          id: string
          product_id: string
          rate: number
          rejected_qty: number
          remarks: string | null
          status: string
        }
        Insert: {
          approved_qty?: number
          bill_amount?: number
          created_at?: string
          customer_id: string
          delivered_qty: number
          delivery_date?: string
          id?: string
          product_id: string
          rate: number
          rejected_qty?: number
          remarks?: string | null
          status?: string
        }
        Update: {
          approved_qty?: number
          bill_amount?: number
          created_at?: string
          customer_id?: string
          delivered_qty?: number
          delivery_date?: string
          id?: string
          product_id?: string
          rate?: number
          rejected_qty?: number
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          id: string
          join_date: string | null
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          join_date?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          join_date?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          employee_id: string | null
          expense_date: string
          expense_type: string
          id: string
          payment_method: string | null
          remarks: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          employee_id?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          payment_method?: string | null
          remarks?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          employee_id?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          payment_method?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      income_entries: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          delivery_id: string | null
          id: string
          income_date: string
          income_type: string
          payment_method: string | null
          reference: string | null
          remarks: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          delivery_id?: string | null
          id?: string
          income_date?: string
          income_type: string
          payment_method?: string | null
          reference?: string | null
          remarks?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          delivery_id?: string | null
          id?: string
          income_date?: string
          income_type?: string
          payment_method?: string | null
          reference?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_entries_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      production_entries: {
        Row: {
          calculated_wage: number
          created_at: string
          employee_id: string
          id: string
          machine_id: string
          piece_rate: number
          product_id: string
          production_date: string
          quantity: number
          remarks: string | null
        }
        Insert: {
          calculated_wage: number
          created_at?: string
          employee_id: string
          id?: string
          machine_id: string
          piece_rate: number
          product_id: string
          production_date?: string
          quantity: number
          remarks?: string | null
        }
        Update: {
          calculated_wage?: number
          created_at?: string
          employee_id?: string
          id?: string
          machine_id?: string
          piece_rate?: number
          product_id?: string
          production_date?: string
          quantity?: number
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_rate: number
          id: string
          name: string
          unit: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_rate?: number
          id?: string
          name: string
          unit?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_rate?: number
          id?: string
          name?: string
          unit?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
