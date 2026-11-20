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
      trips: {
        Row: {
          id: string;
          owner_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          travelers: string[];
          budget: number;
          currency: string;
          travel_style: string;
          is_ended: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          travelers: string[];
          budget: number;
          currency: string;
          travel_style: string;
          is_ended?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          destination?: string;
          start_date?: string;
          end_date?: string;
          travelers?: string[];
          budget?: number;
          currency?: string;
          travel_style?: string;
          is_ended?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          owner_id: string;
          trip_id: string;
          description: string;
          place: string;
          category: string;
          amount: number;
          date: string;
          paid_by: string;
          split_type: "equal" | "custom";
          split_among: string[];
          custom_shares: Json;
          receipt_name: string | null;
          receipt_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          trip_id: string;
          description: string;
          place: string;
          category: string;
          amount: number;
          date: string;
          paid_by: string;
          split_type: "equal" | "custom";
          split_among: string[];
          custom_shares: Json;
          receipt_name?: string | null;
          receipt_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          trip_id?: string;
          description?: string;
          place?: string;
          category?: string;
          amount?: number;
          date?: string;
          paid_by?: string;
          split_type?: "equal" | "custom";
          split_among?: string[];
          custom_shares?: Json;
          receipt_name?: string | null;
          receipt_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      settlement_payments: {
        Row: {
          id: string;
          owner_id: string;
          trip_id: string;
          payer: string;
          payee: string;
          amount_cents: number;
          status: "pending" | "paid";
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          trip_id: string;
          payer: string;
          payee: string;
          amount_cents: number;
          status: "pending" | "paid";
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          trip_id?: string;
          payer?: string;
          payee?: string;
          amount_cents?: number;
          status?: "pending" | "paid";
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
