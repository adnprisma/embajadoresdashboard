// ---------------------------------------------------------------
// ESCRITO A MANO — no generado por `supabase gen types typescript`.
//
// Este entorno no tiene Docker (para `--local`) ni un proyecto Supabase
// enlazado con credenciales (para `--linked` / `--project-id`), así que no
// hay una base de datos real contra la cual correr el generador. Este
// archivo replica a mano la forma exacta que produce esa herramienta a
// partir de supabase/migrations/0001_schema.sql, 0002_rls.sql y
// 0003_functions.sql.
//
// En cuanto exista un proyecto real, reemplázalo con el comando de verdad:
//   supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts
// ---------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          ref_code: string;
          plan: string;
          status: string;
          billing_complete: boolean;
          bank_data: Json | null;
          tax_data: Json | null;
          own_prices: Json | null;
          tour_seen: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email: string;
          avatar_url?: string | null;
          ref_code: string;
          plan?: string;
          status?: string;
          billing_complete?: boolean;
          bank_data?: Json | null;
          tax_data?: Json | null;
          own_prices?: Json | null;
          tour_seen?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          ref_code?: string;
          plan?: string;
          status?: string;
          billing_complete?: boolean;
          bank_data?: Json | null;
          tax_data?: Json | null;
          own_prices?: Json | null;
          tour_seen?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      contacts: {
        Row: {
          id: string;
          owner_id: string;
          business_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          industry: string | null;
          tags: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          industry?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          business_name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          industry?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      pipeline_stages: {
        Row: {
          id: string;
          name: string;
          icon: string;
          accent: string;
          position: number;
          is_won: boolean;
          is_lost: boolean;
        };
        Insert: {
          id: string;
          name: string;
          icon: string;
          accent: string;
          position: number;
          is_won?: boolean;
          is_lost?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          accent?: string;
          position?: number;
          is_won?: boolean;
          is_lost?: boolean;
        };
        Relationships: [];
      };

      opportunities: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string | null;
          business_name: string;
          stage_id: string;
          value: number;
          mrr: number;
          position: number;
          closed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          contact_id?: string | null;
          business_name: string;
          stage_id: string;
          value?: number;
          mrr?: number;
          position?: number;
          closed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact_id?: string | null;
          business_name?: string;
          stage_id?: string;
          value?: number;
          mrr?: number;
          position?: number;
          closed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };

      tasks: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string | null;
          title: string;
          due_at: string | null;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          contact_id?: string | null;
          title: string;
          due_at?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact_id?: string | null;
          title?: string;
          due_at?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };

      interactions: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string;
          kind: string;
          body: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          contact_id: string;
          kind: string;
          body?: string | null;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact_id?: string;
          kind?: string;
          body?: string | null;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };

      appointments: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          status: string;
          visibility: string;
          url: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          contact_id?: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          status?: string;
          visibility?: string;
          url?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact_id?: string | null;
          title?: string;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          visibility?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };

      clients: {
        Row: {
          id: string;
          owner_id: string;
          opportunity_id: string | null;
          name: string;
          plan: string | null;
          mrr: number;
          status: string;
          started_at: string;
          next_renewal: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          opportunity_id?: string | null;
          name: string;
          plan?: string | null;
          mrr?: number;
          status?: string;
          started_at?: string;
          next_renewal?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          opportunity_id?: string | null;
          name?: string;
          plan?: string | null;
          mrr?: number;
          status?: string;
          started_at?: string;
          next_renewal?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };

      commissions: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string | null;
          concept: string;
          amount: number;
          status: string;
          is_estimate: boolean;
          folio: string | null;
          period: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          client_id?: string | null;
          concept: string;
          amount?: number;
          status?: string;
          is_estimate?: boolean;
          folio?: string | null;
          period: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          client_id?: string | null;
          concept?: string;
          amount?: number;
          status?: string;
          is_estimate?: boolean;
          folio?: string | null;
          period?: string;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commissions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };

      points_ledger: {
        Row: {
          id: string;
          owner_id: string;
          concept: string;
          kind: string;
          status: string;
          amount: number;
          source_name: string | null;
          folio: string | null;
          unlocks_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          concept: string;
          kind: string;
          status?: string;
          amount: number;
          source_name?: string | null;
          folio?: string | null;
          unlocks_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          concept?: string;
          kind?: string;
          status?: string;
          amount?: number;
          source_name?: string | null;
          folio?: string | null;
          unlocks_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "points_ledger_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      notifications: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          body: string | null;
          href: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          body?: string | null;
          href?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          body?: string | null;
          href?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      resources: {
        Row: {
          id: string;
          category_id: string;
          category_name: string;
          category_icon: string;
          position: number;
          title: string;
          subtitle: string | null;
          icon: string | null;
          badge_label: string | null;
          badge_tone: string | null;
          items: Json;
          required_plan: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          category_name: string;
          category_icon: string;
          position: number;
          title: string;
          subtitle?: string | null;
          icon?: string | null;
          badge_label?: string | null;
          badge_tone?: string | null;
          items?: Json;
          required_plan?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string;
          category_name?: string;
          category_icon?: string;
          position?: number;
          title?: string;
          subtitle?: string | null;
          icon?: string | null;
          badge_label?: string | null;
          badge_tone?: string | null;
          items?: Json;
          required_plan?: string | null;
        };
        Relationships: [];
      };

      ranks: {
        Row: {
          id: string;
          name: string;
          min_points: number;
          tone: string;
          position: number;
        };
        Insert: {
          id: string;
          name: string;
          min_points: number;
          tone: string;
          position: number;
        };
        Update: {
          id?: string;
          name?: string;
          min_points?: number;
          tone?: string;
          position?: number;
        };
        Relationships: [];
      };

      app_config: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      my_wallet_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          locked: number;
          total: number;
        }[];
      };
      my_wallet_history: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: Database["public"]["Tables"]["points_ledger"]["Row"][];
      };
      my_rank: {
        Args: Record<PropertyKey, never>;
        Returns: {
          position: number;
          total_users: number;
          points: number;
          rank_id: string | null;
          streak: number;
        }[];
      };
      leaderboard: {
        Args: {
          p_period?: string;
        };
        Returns: {
          profile_id: string;
          display_name: string;
          points: number;
          rank_position: number;
          is_me: boolean;
        }[];
      };
      my_dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      my_pipeline_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          new_month: number;
          analyses: number;
          show_rate: number;
          close_rate: number;
          volume_month: number;
          closes_month: number;
        }[];
      };
      mark_tour_seen: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
