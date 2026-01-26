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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          text?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          giftbox_reward_id: string | null
          id: string
          image_url: string
          is_giftbox: boolean | null
          is_on_sale: boolean | null
          item_type: Database["public"]["Enums"]["item_type"]
          max_stock: number | null
          name: string
          price: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          giftbox_reward_id?: string | null
          id?: string
          image_url: string
          is_giftbox?: boolean | null
          is_on_sale?: boolean | null
          item_type?: Database["public"]["Enums"]["item_type"]
          max_stock?: number | null
          name: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          giftbox_reward_id?: string | null
          id?: string
          image_url?: string
          is_giftbox?: boolean | null
          is_on_sale?: boolean | null
          item_type?: Database["public"]["Enums"]["item_type"]
          max_stock?: number | null
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_giftbox_reward_id_fkey"
            columns: ["giftbox_reward_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friend_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friend_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friend_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_data: Json | null
          ban_reason: string | null
          created_at: string
          emeralds: number
          id: string
          is_banned: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          last_daily_claim: string | null
          last_seen: string | null
          numeric_id: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_data?: Json | null
          ban_reason?: string | null
          created_at?: string
          emeralds?: number
          id?: string
          is_banned?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_daily_claim?: string | null
          last_seen?: string | null
          numeric_id?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_data?: Json | null
          ban_reason?: string | null
          created_at?: string
          emeralds?: number
          id?: string
          is_banned?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_daily_claim?: string | null
          last_seen?: string | null
          numeric_id?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      promocode_redemptions: {
        Row: {
          id: string
          promocode_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promocode_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promocode_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocode_redemptions_promocode_id_fkey"
            columns: ["promocode_id"]
            isOneToOne: false
            referencedRelation: "promocodes"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          emerald_reward: number | null
          id: string
          is_active: boolean | null
          item_reward_id: string | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          emerald_reward?: number | null
          id?: string
          is_active?: boolean | null
          item_reward_id?: string | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          emerald_reward?: number | null
          id?: string
          is_active?: boolean | null
          item_reward_id?: string | null
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promocodes_item_reward_id_fkey"
            columns: ["item_reward_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          id: string
          receiver_emeralds: number | null
          receiver_id: string
          receiver_items: string[] | null
          sender_emeralds: number | null
          sender_id: string
          sender_items: string[] | null
          status: Database["public"]["Enums"]["trade_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_emeralds?: number | null
          receiver_id: string
          receiver_items?: string[] | null
          sender_emeralds?: number | null
          sender_id: string
          sender_items?: string[] | null
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_emeralds?: number | null
          receiver_id?: string
          receiver_items?: string[] | null
          sender_emeralds?: number | null
          sender_id?: string
          sender_items?: string[] | null
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          acquired_at: string
          id: string
          is_equipped: boolean | null
          item_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          is_equipped?: boolean | null
          item_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          is_equipped?: boolean | null
          item_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      friend_status: "pending" | "accepted" | "declined"
      item_type: "normal" | "limited" | "giftbox"
      trade_status: "pending" | "accepted" | "declined" | "cancelled"
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
      app_role: ["admin", "user"],
      friend_status: ["pending", "accepted", "declined"],
      item_type: ["normal", "limited", "giftbox"],
      trade_status: ["pending", "accepted", "declined", "cancelled"],
    },
  },
} as const
