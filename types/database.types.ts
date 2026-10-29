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
      channels: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          current_program: string | null;
          stream_url: string;
          embed_url: string | null;
          backup_url: string | null;
          is_live: boolean | null;
          logo: string | null;
          viewers: string | null;
          resolution: string | null;
          description: string | null;
          country: string | null;
          sort_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          category?: string | null;
          current_program?: string | null;
          stream_url: string;
          embed_url?: string | null;
          backup_url?: string | null;
          is_live?: boolean | null;
          logo?: string | null;
          viewers?: string | null;
          resolution?: string | null;
          description?: string | null;
          country?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          current_program?: string | null;
          stream_url?: string;
          embed_url?: string | null;
          backup_url?: string | null;
          is_live?: boolean | null;
          logo?: string | null;
          viewers?: string | null;
          resolution?: string | null;
          description?: string | null;
          country?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string | null;
          channel_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          channel_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          channel_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          role: 'user' | 'admin';
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          role?: 'user' | 'admin';
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          role?: 'user' | 'admin';
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          plan_name: string;
          provider: string;
          phone: string | null;
          amount: number;
          status: string;
          activated_at: string | null;
          expires_at: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          plan_name?: string;
          provider: string;
          phone?: string | null;
          amount?: number;
          status?: string;
          activated_at?: string | null;
          expires_at: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          plan_name?: string;
          provider?: string;
          phone?: string | null;
          amount?: number;
          status?: string;
          activated_at?: string | null;
          expires_at?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      library: {
        Row: {
          id: string;
          name: string;
          url: string;
          category: string;
          region: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          category?: string;
          region?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          category?: string;
          region?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          id: string;
          code: string;
          discount_percent: number;
          applicable_plan: string;
          duration_minutes: number;
          max_uses: number;
          used_count: number;
          expires_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_percent: number;
          applicable_plan?: string;
          duration_minutes?: number;
          max_uses?: number;
          used_count?: number;
          expires_at: string;
          is_active?: boolean;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          discount_percent?: number;
          applicable_plan?: string;
          duration_minutes?: number;
          max_uses?: number;
          used_count?: number;
          expires_at?: string;
          is_active?: boolean;
          created_at?: string | null;
        };
        Relationships: [];
      };
      promo_redemptions: {
        Row: {
          id: string;
          promo_code_id: string;
          code: string;
          user_id: string | null;
          user_email: string | null;
          redeemed_at: string | null;
        };
        Insert: {
          id?: string;
          promo_code_id: string;
          code: string;
          user_id?: string | null;
          user_email?: string | null;
          redeemed_at?: string | null;
        };
        Update: {
          id?: string;
          promo_code_id?: string;
          code?: string;
          user_id?: string | null;
          user_email?: string | null;
          redeemed_at?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          user_email: string | null;
          avatar_url: string | null;
          channel_room: 'general' | 'channel_requests' | 'feedback' | 'announcements';
          message: string;
          upvotes: number;
          status: 'pending' | 'under_review' | 'completed';
          is_admin: boolean;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          user_email?: string | null;
          avatar_url?: string | null;
          channel_room?: 'general' | 'channel_requests' | 'feedback' | 'announcements';
          message: string;
          upvotes?: number;
          status?: 'pending' | 'under_review' | 'completed';
          is_admin?: boolean;
          is_pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string;
          user_email?: string | null;
          avatar_url?: string | null;
          channel_room?: 'general' | 'channel_requests' | 'feedback' | 'announcements';
          message?: string;
          upvotes?: number;
          status?: 'pending' | 'under_review' | 'completed';
          is_admin?: boolean;
          is_pinned?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_upvotes: {
        Row: {
          message_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      generate_promo_code: {
        Args: {
          p_code?: string | null;
          p_discount_percent?: number;
          p_applicable_plan?: string;
          p_max_uses?: number;
          p_duration_minutes?: number;
        };
        Returns: Json;
      };
      redeem_promo_code: {
        Args: {
          p_code: string;
          p_user_id?: string | null;
          p_user_email?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {};
  };
};
