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
      creator_services: {
        Row: {
          created_at: string
          creator_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_services_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      free_photos: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          order_index: number
          photo_url: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          order_index?: number
          photo_url: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          order_index?: number
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_photos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_photos: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          is_cover: boolean
          order_index: number
          photo_url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          is_cover?: boolean
          order_index?: number
          photo_url: string
          video_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          is_cover?: boolean
          order_index?: number
          photo_url?: string
          video_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: string
          profile_id: string
          user_agent: string | null
          viewed_at: string
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          user_agent?: string | null
          viewed_at?: string
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          user_agent?: string | null
          viewed_at?: string
          viewer_ip?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_photo_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          creator_id: string
          customer_id: string
          download_expires_at: string | null
          download_token: string | null
          id: string
          paid_at: string | null
          pix_transaction_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          video_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          creator_id: string
          customer_id: string
          download_expires_at?: string | null
          download_token?: string | null
          id?: string
          paid_at?: string | null
          pix_transaction_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          video_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          creator_id?: string
          customer_id?: string
          download_expires_at?: string | null
          download_token?: string | null
          id?: string
          paid_at?: string | null
          pix_transaction_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_vouchers: {
        Row: {
          amount_paid: number | null
          code: string
          created_at: string
          creator_id: string
          customer_label: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          use_count: number
          video_id: string
        }
        Insert: {
          amount_paid?: number | null
          code: string
          created_at?: string
          creator_id: string
          customer_label?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          use_count?: number
          video_id: string
        }
        Update: {
          amount_paid?: number | null
          code?: string
          created_at?: string
          creator_id?: string
          customer_label?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          use_count?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_vouchers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_vouchers_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          content_type: string
          created_at: string
          creator_id: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_free: boolean
          price_brl: number
          purchase_count: number
          resolution: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          creator_id: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_free?: boolean
          price_brl: number
          purchase_count?: number
          resolution?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_free?: boolean
          price_brl?: number
          purchase_count?: number
          resolution?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "creator" | "customer"
      purchase_status: "pending" | "paid" | "expired"
      service_category:
        | "gerais"
        | "especiais"
        | "aparencia_etnia"
        | "aparencia_cabelo"
        | "aparencia_estatura"
        | "aparencia_corpo"
        | "aparencia_seios"
        | "aparencia_pubis"
        | "atendimento"
        | "contato"
        | "lugar"
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
    Enums: {
      app_role: ["super_admin", "creator", "customer"],
      purchase_status: ["pending", "paid", "expired"],
      service_category: [
        "gerais",
        "especiais",
        "aparencia_etnia",
        "aparencia_cabelo",
        "aparencia_estatura",
        "aparencia_corpo",
        "aparencia_seios",
        "aparencia_pubis",
        "atendimento",
        "contato",
        "lugar",
      ],
    },
  },
} as const
