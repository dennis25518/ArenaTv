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
    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {};
  };
};
