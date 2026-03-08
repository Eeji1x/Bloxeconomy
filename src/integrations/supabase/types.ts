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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
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
          resell_enabled: boolean | null
          sale_end_time: string | null
          sale_start_time: string | null
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
          resell_enabled?: boolean | null
          sale_end_time?: string | null
          sale_start_time?: string | null
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
          resell_enabled?: boolean | null
          sale_end_time?: string | null
          sale_start_time?: string | null
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
      invite_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_used: boolean
          key: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_used?: boolean
          key: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_used?: boolean
          key?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      item_serials: {
        Row: {
          created_at: string
          id: string
          inventory_id: string | null
          is_seized: boolean | null
          item_id: string
          original_owner_id: string
          owner_id: string
          serial_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          is_seized?: boolean | null
          item_id: string
          original_owner_id: string
          owner_id: string
          serial_number: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          is_seized?: boolean | null
          item_id?: string
          original_owner_id?: string
          owner_id?: string
          serial_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_serials_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "user_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_serials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: {
        Row: {
          created_at: string
          id: string
          item_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_values: {
        Row: {
          demand: string
          id: string
          item_id: string
          rap: number
          trend: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          demand?: string
          id?: string
          item_id: string
          rap?: number
          trend?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          demand?: string
          id?: string
          item_id?: string
          rap?: number
          trend?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_values_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lotteries: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number
          ends_at: string
          id: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number
          ends_at: string
          id?: string
          starts_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      lottery_prizes: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          item_id: string
          lottery_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          item_id: string
          lottery_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          item_id?: string
          lottery_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lottery_prizes_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "user_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lottery_prizes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lottery_prizes_lottery_id_fkey"
            columns: ["lottery_id"]
            isOneToOne: false
            referencedRelation: "lotteries"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          is_system: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_data: Json | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
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
          banned_at?: string | null
          banned_by?: string | null
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
          banned_at?: string | null
          banned_by?: string | null
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
      resale_listings: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          is_active: boolean
          item_id: string
          price: number
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          is_active?: boolean
          item_id: string
          price: number
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          is_active?: boolean
          item_id?: string
          price?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resale_listings_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: true
            referencedRelation: "user_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resale_listings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
      value_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          item_id: string
          new_demand: string | null
          new_trend: string | null
          new_value: number
          old_demand: string | null
          old_trend: string | null
          old_value: number | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          item_id: string
          new_demand?: string | null
          new_trend?: string | null
          new_value: number
          old_demand?: string | null
          old_trend?: string | null
          old_value?: number | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          item_id?: string
          new_demand?: string | null
          new_trend?: string | null
          new_value?: number
          old_demand?: string | null
          old_trend?: string | null
          old_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "value_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_serial: { Args: { p_item_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_economy_manager: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      next_profile_numeric_id: { Args: never; Returns: number }
      reset_profiles_numeric_id_seq: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "economy_manager" | "owner"
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
      app_role: ["admin", "user", "economy_manager", "owner"],
      friend_status: ["pending", "accepted", "declined"],
      item_type: ["normal", "limited", "giftbox"],
      trade_status: ["pending", "accepted", "declined", "cancelled"],
    },
  },
} as const
