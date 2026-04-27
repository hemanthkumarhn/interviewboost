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
      generations: {
        Insert: {
          created_at?: string;
          id?: string;
          input_snapshot?: Json | null;
          jd_text?: string | null;
          output?: string | null;
          resume_id?: string | null;
          tokens_used?: number | null;
          type: "ats_score" | "cover_letter" | "jd_match" | "linkedin";
          user_id: string;
        };
        Row: {
          created_at: string;
          id: string;
          input_snapshot: Json | null;
          jd_text: string | null;
          output: string | null;
          resume_id: string | null;
          tokens_used: number | null;
          type: "ats_score" | "cover_letter" | "jd_match" | "linkedin";
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_snapshot?: Json | null;
          jd_text?: string | null;
          output?: string | null;
          resume_id?: string | null;
          tokens_used?: number | null;
          type?: "ats_score" | "cover_letter" | "jd_match" | "linkedin";
          user_id?: string;
        };
      };
      plans: {
        Insert: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          plan_type: "30_day" | "60_day";
          start_date?: string | null;
          target_date?: string | null;
          target_role?: string | null;
          user_id: string;
        };
        Row: {
          config: Json | null;
          created_at: string;
          id: string;
          plan_type: "30_day" | "60_day";
          start_date: string | null;
          target_date: string | null;
          target_role: string | null;
          user_id: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          plan_type?: "30_day" | "60_day";
          start_date?: string | null;
          target_date?: string | null;
          target_role?: string | null;
          user_id?: string;
        };
      };
      resumes: {
        Insert: {
          ats_score?: number | null;
          content?: Json;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          last_jd?: string | null;
          template_id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Row: {
          ats_score: number | null;
          content: Json;
          created_at: string;
          id: string;
          is_primary: boolean;
          last_jd: string | null;
          template_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Update: {
          ats_score?: number | null;
          content?: Json;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          last_jd?: string | null;
          template_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      users: {
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          credits_left?: number;
          email: string;
          id: string;
          name?: string | null;
          plan?: "free" | "pro" | "pro_plus";
          razorpay_customer_id?: string | null;
          subscription_end?: string | null;
          subscription_id?: string | null;
        };
        Row: {
          avatar_url: string | null;
          created_at: string;
          credits_left: number;
          email: string;
          id: string;
          name: string | null;
          plan: "free" | "pro" | "pro_plus";
          razorpay_customer_id: string | null;
          subscription_end: string | null;
          subscription_id: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          credits_left?: number;
          email?: string;
          id?: string;
          name?: string | null;
          plan?: "free" | "pro" | "pro_plus";
          razorpay_customer_id?: string | null;
          subscription_end?: string | null;
          subscription_id?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
