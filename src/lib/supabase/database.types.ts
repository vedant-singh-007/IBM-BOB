// Database type definitions – mirrors the SQL schema
// These can be auto-generated with: supabase gen types typescript --local

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// GenericRelationship compatible type
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      brand_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          tone: string | null;
          guidelines: string | null;
          target_audience: string | null;
          preferred_vocabulary: string[] | null;
          words_to_avoid: string[] | null;
          example_posts: string[] | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; name: string; description?: string | null; tone?: string | null; guidelines?: string | null; target_audience?: string | null; preferred_vocabulary?: string[] | null; words_to_avoid?: string[] | null; example_posts?: string[] | null; is_default?: boolean; };
        Update: Partial<Database["public"]["Tables"]["brand_profiles"]["Insert"]>;
        Relationships: Relationship[];
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          brand_profile_id: string | null;
          name: string;
          objective: string;
          product: string | null;
          target_audience: string | null;
          core_message: string | null;
          call_to_action: string | null;
          platforms: string[] | null;
          status: "draft" | "review" | "approved" | "scheduled" | "published";
          strategy: string | null;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; name: string; objective: string; brand_profile_id?: string | null; product?: string | null; target_audience?: string | null; core_message?: string | null; call_to_action?: string | null; platforms?: string[] | null; status?: "draft" | "review" | "approved" | "scheduled" | "published"; strategy?: string | null; scheduled_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
        Relationships: Relationship[];
      };
      content_assets: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          brand_profile_id: string | null;
          title: string;
          content: string;
          asset_type: "post" | "email" | "blog_outline" | "summary" | "repurposed" | "custom";
          platform: string | null;
          tone: string | null;
          language: string;
          target_audience: string | null;
          brief: string | null;
          status: "draft" | "review" | "approved" | "scheduled" | "published";
          word_count: number | null;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; content: string; title?: string; asset_type?: "post" | "email" | "blog_outline" | "summary" | "repurposed" | "custom"; campaign_id?: string | null; brand_profile_id?: string | null; platform?: string | null; tone?: string | null; language?: string; target_audience?: string | null; brief?: string | null; status?: "draft" | "review" | "approved" | "scheduled" | "published"; word_count?: number | null; scheduled_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["content_assets"]["Insert"]>;
        Relationships: Relationship[];
      };
      content_revisions: {
        Row: {
          id: string;
          asset_id: string;
          user_id: string;
          content: string;
          note: string | null;
          created_at: string;
        };
        Insert: { asset_id: string; user_id: string; content: string; note?: string | null; };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      critic_reviews: {
        Row: {
          id: string;
          asset_id: string;
          user_id: string;
          findings: CriticFinding[];
          overall: string | null;
          created_at: string;
        };
        Insert: { asset_id: string; user_id: string; findings: CriticFinding[]; overall?: string | null; };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      media_assets: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          filename: string;
          mime_type: string;
          size_bytes: number;
          width: number | null;
          height: number | null;
          ai_description: string | null;
          tags: string[] | null;
          alt_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; storage_path: string; filename: string; mime_type: string; size_bytes: number; width?: number | null; height?: number | null; ai_description?: string | null; tags?: string[] | null; alt_text?: string | null; };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Insert"]>;
        Relationships: Relationship[];
      };
    };
    Views: Record<string, {
      Row: Record<string, unknown>;
      Relationships: Relationship[];
    }>;
    Functions: Record<string, {
      Args: Record<string, unknown>;
      Returns: unknown;
    }>;
    Enums: Record<string, string>;
  };
}

// Shared domain types
export interface CriticFinding {
  category: string;
  severity: "info" | "warning" | "error";
  description: string;
  suggestion: string | null;
}

export type BrandProfile = Database["public"]["Tables"]["brand_profiles"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type ContentAsset = Database["public"]["Tables"]["content_assets"]["Row"];
export type ContentRevision = Database["public"]["Tables"]["content_revisions"]["Row"];
export type CriticReview = Database["public"]["Tables"]["critic_reviews"]["Row"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
