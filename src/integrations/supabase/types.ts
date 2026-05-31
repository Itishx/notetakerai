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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_commands: {
        Row: {
          created_at: string
          id: string
          result: string | null
          status: string
          steps: Json
          task: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result?: string | null
          status?: string
          steps?: Json
          task: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result?: string | null
          status?: string
          steps?: Json
          task?: string
          user_id?: string
        }
        Relationships: []
      }
      google_drive_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          google_user_id: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_identifier: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          google_user_id?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          google_user_id?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          source_title: string | null
          source_url: string | null
          structured_notes: string | null
          title: string | null
          transcript: string | null
          updated_at: string
          use_case: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          source_title?: string | null
          source_url?: string | null
          structured_notes?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          use_case?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          source_title?: string | null
          source_url?: string | null
          structured_notes?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          use_case?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notion_connections: {
        Row: {
          access_token: string
          bot_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_identifier: string
          workspace_id: string | null
          workspace_name: string | null
        }
        Insert: {
          access_token: string
          bot_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_identifier: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Update: {
          access_token?: string
          bot_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_identifier?: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_premium: boolean
          overall_memory: string
          polar_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean
          overall_memory?: string
          polar_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean
          overall_memory?: string
          polar_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reddit_posts: {
        Row: {
          agent_command_id: string | null
          body: string
          created_at: string | null
          id: string
          scheduled_at: string
          status: string
          subreddit: string
          title: string
          user_id: string
        }
        Insert: {
          agent_command_id?: string | null
          body: string
          created_at?: string | null
          id?: string
          scheduled_at: string
          status?: string
          subreddit: string
          title: string
          user_id: string
        }
        Update: {
          agent_command_id?: string | null
          body?: string
          created_at?: string | null
          id?: string
          scheduled_at?: string
          status?: string
          subreddit?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_x_posts: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          id: string
          posted_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
          x_post_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          posted_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
          x_post_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          posted_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          x_post_id?: string | null
        }
        Relationships: []
      }
      user_watched_movies: {
        Row: {
          completed: boolean | null
          created_at: string
          genres: string[] | null
          id: string
          movie_title: string
          poster_url: string | null
          rating: number | null
          tmdb_id: number | null
          user_id: string
          watched_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          genres?: string[] | null
          id?: string
          movie_title: string
          poster_url?: string | null
          rating?: number | null
          tmdb_id?: number | null
          user_id: string
          watched_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          genres?: string[] | null
          id?: string
          movie_title?: string
          poster_url?: string | null
          rating?: number | null
          tmdb_id?: number | null
          user_id?: string
          watched_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          context: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      x_auto_persona: {
        Row: {
          auto_posting_enabled: boolean
          auto_reply_enabled: boolean
          bio: string
          content_source: string | null
          created_at: string
          display_name: string
          id: string
          last_mention_id: string | null
          posts_per_day: number
          tone_notes: string
          updated_at: string
          user_id: string
          what_building: string
          x_user_id: string | null
        }
        Insert: {
          auto_posting_enabled?: boolean
          auto_reply_enabled?: boolean
          bio?: string
          content_source?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_mention_id?: string | null
          posts_per_day?: number
          tone_notes?: string
          updated_at?: string
          user_id: string
          what_building?: string
          x_user_id?: string | null
        }
        Update: {
          auto_posting_enabled?: boolean
          auto_reply_enabled?: boolean
          bio?: string
          content_source?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_mention_id?: string | null
          posts_per_day?: number
          tone_notes?: string
          updated_at?: string
          user_id?: string
          what_building?: string
          x_user_id?: string | null
        }
        Relationships: []
      }
      x_auto_sessions: {
        Row: {
          created_at: string
          cooldown_ends_at: string
          current_followers_count: number
          current_replies_received: number
          current_total_views: number
          ends_at: string
          followers_gained: number
          id: string
          last_polled_at: string | null
          last_reply_at: string | null
          mention_watermark_id: string | null
          replies_failed: number
          replies_posted: number
          replies_queued: number
          replies_received: number
          session_number: number
          start_followers_count: number
          start_replies_received: number
          start_total_views: number
          started_at: string
          status: string
          stopped_at: string | null
          total_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cooldown_ends_at: string
          current_followers_count?: number
          current_replies_received?: number
          current_total_views?: number
          ends_at: string
          followers_gained?: number
          id?: string
          last_polled_at?: string | null
          last_reply_at?: string | null
          mention_watermark_id?: string | null
          replies_failed?: number
          replies_posted?: number
          replies_queued?: number
          replies_received?: number
          session_number: number
          start_followers_count?: number
          start_replies_received?: number
          start_total_views?: number
          started_at?: string
          status?: string
          stopped_at?: string | null
          total_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cooldown_ends_at?: string
          current_followers_count?: number
          current_replies_received?: number
          current_total_views?: number
          ends_at?: string
          followers_gained?: number
          id?: string
          last_polled_at?: string | null
          last_reply_at?: string | null
          mention_watermark_id?: string | null
          replies_failed?: number
          replies_posted?: number
          replies_queued?: number
          replies_received?: number
          session_number?: number
          start_followers_count?: number
          start_replies_received?: number
          start_total_views?: number
          started_at?: string
          status?: string
          stopped_at?: string | null
          total_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      x_auto_reply_logs: {
        Row: {
          id: string
          discovered_at: string
          error_message: string | null
          mention_tweet_id: string | null
          our_reply: string
          our_reply_tweet_id: string | null
          post_author_display_name: string
          post_author_handle: string
          post_text: string
          post_url: string
          replied_at: string | null
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          discovered_at?: string
          error_message?: string | null
          id?: string
          mention_tweet_id?: string | null
          our_reply?: string
          our_reply_tweet_id?: string | null
          post_author_display_name?: string
          post_author_handle?: string
          post_text?: string
          post_url?: string
          replied_at?: string | null
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          discovered_at?: string
          error_message?: string | null
          id?: string
          mention_tweet_id?: string | null
          our_reply?: string
          our_reply_tweet_id?: string | null
          post_author_display_name?: string
          post_author_handle?: string
          post_text?: string
          post_url?: string
          replied_at?: string | null
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "x_auto_reply_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "x_auto_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      x_connections: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_identifier: string
          username: string | null
          x_user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier: string
          username?: string | null
          x_user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier?: string
          username?: string | null
          x_user_id?: string | null
        }
        Relationships: []
      }
      x_oauth_states: {
        Row: {
          code_verifier: string
          created_at: string
          state: string
          user_identifier: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          state: string
          user_identifier: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          state?: string
          user_identifier?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_scheduled_reddit_posts: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const
