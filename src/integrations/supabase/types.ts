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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          note: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          note?: string | null
          tier?: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          note?: string | null
          tier?: string
        }
        Relationships: []
      }
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
      braino_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          name_key: string
          nickname: string | null
          nickname_key: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          name_key: string
          nickname?: string | null
          nickname_key?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          name_key?: string
          nickname?: string | null
          nickname_key?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      braino_dev_pulse: {
        Row: {
          fetched_at: string
          payload: Json
          repo: string
        }
        Insert: {
          fetched_at?: string
          payload: Json
          repo: string
        }
        Update: {
          fetched_at?: string
          payload?: Json
          repo?: string
        }
        Relationships: []
      }
      braino_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          dedup_key: string | null
          id: string
          last_used_at: string | null
          salience: number
          source: string
          status: string
          supersedes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          dedup_key?: string | null
          id?: string
          last_used_at?: string | null
          salience?: number
          source?: string
          status?: string
          supersedes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          dedup_key?: string | null
          id?: string
          last_used_at?: string | null
          salience?: number
          source?: string
          status?: string
          supersedes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          google_user_id: string | null
          id: string
          last_sync_at: string | null
          primary_calendar_id: string
          refresh_token: string | null
          scope: string | null
          sync_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_identifier: string
          watch_channel_id: string | null
          watch_expires_at: string | null
          watch_resource_id: string | null
          watch_token: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          google_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          primary_calendar_id?: string
          refresh_token?: string | null
          scope?: string | null
          sync_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          google_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          primary_calendar_id?: string
          refresh_token?: string | null
          scope?: string | null
          sync_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Relationships: []
      }
      google_calendar_reminder_announcements: {
        Row: {
          announced_at: string
          created_at: string
          event_id: string
          event_start_at: string
          id: string
          reminder_key: string
          user_identifier: string
        }
        Insert: {
          announced_at?: string
          created_at?: string
          event_id: string
          event_start_at: string
          id?: string
          reminder_key: string
          user_identifier: string
        }
        Update: {
          announced_at?: string
          created_at?: string
          event_id?: string
          event_start_at?: string
          id?: string
          reminder_key?: string
          user_identifier?: string
        }
        Relationships: []
      }
      google_drive_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          google_email: string | null
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
          expires_at?: string | null
          google_email?: string | null
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
          expires_at?: string | null
          google_email?: string | null
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
          hidden_modes_credential_id: string | null
          id: string
          is_premium: boolean
          memory_enabled: boolean
          overall_memory: string
          personality_settings: Json | null
          polar_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          hidden_modes_credential_id?: string | null
          id?: string
          is_premium?: boolean
          memory_enabled?: boolean
          overall_memory?: string
          personality_settings?: Json | null
          polar_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          hidden_modes_credential_id?: string | null
          id?: string
          is_premium?: boolean
          memory_enabled?: boolean
          overall_memory?: string
          personality_settings?: Json | null
          polar_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      realtime_voice_sessions: {
        Row: {
          allocated_ms: number
          created_at: string
          disconnect_reason: string | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_ms: number
          created_at?: string
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_ms?: number
          created_at?: string
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      realtime_voice_turn_logs: {
        Row: {
          assistant_messages: Json
          completed_at: string | null
          connector: string | null
          cost_confidence: string
          created_at: string
          estimated_openai_realtime_cost_usd: number
          estimated_total_cost_usd: number
          estimated_transcription_cost_usd: number
          estimated_tts_cost_usd: number
          id: string
          raw_client_payload: Json
          raw_realtime_usage: Json
          raw_transcription_usage: Json
          raw_tts_usage: Json
          realtime_cached_audio_tokens: number
          realtime_cached_text_tokens: number
          realtime_input_audio_tokens: number
          realtime_input_text_tokens: number
          realtime_model: string | null
          realtime_output_audio_tokens: number
          realtime_output_text_tokens: number
          route_intent: string | null
          route_mode: string | null
          session_id: string | null
          started_at: string
          total_tokens: number
          transcription_input_audio_tokens: number
          transcription_input_text_tokens: number
          transcription_model: string | null
          transcription_output_text_tokens: number
          turn_id: string
          turn_index: number
          updated_at: string
          user_id: string
          user_transcript: string
          voice_id: string | null
          voice_name: string | null
          voice_provider: string | null
        }
        Insert: {
          assistant_messages?: Json
          completed_at?: string | null
          connector?: string | null
          cost_confidence?: string
          created_at?: string
          estimated_openai_realtime_cost_usd?: number
          estimated_total_cost_usd?: number
          estimated_transcription_cost_usd?: number
          estimated_tts_cost_usd?: number
          id?: string
          raw_client_payload?: Json
          raw_realtime_usage?: Json
          raw_transcription_usage?: Json
          raw_tts_usage?: Json
          realtime_cached_audio_tokens?: number
          realtime_cached_text_tokens?: number
          realtime_input_audio_tokens?: number
          realtime_input_text_tokens?: number
          realtime_model?: string | null
          realtime_output_audio_tokens?: number
          realtime_output_text_tokens?: number
          route_intent?: string | null
          route_mode?: string | null
          session_id?: string | null
          started_at?: string
          total_tokens?: number
          transcription_input_audio_tokens?: number
          transcription_input_text_tokens?: number
          transcription_model?: string | null
          transcription_output_text_tokens?: number
          turn_id: string
          turn_index?: number
          updated_at?: string
          user_id: string
          user_transcript?: string
          voice_id?: string | null
          voice_name?: string | null
          voice_provider?: string | null
        }
        Update: {
          assistant_messages?: Json
          completed_at?: string | null
          connector?: string | null
          cost_confidence?: string
          created_at?: string
          estimated_openai_realtime_cost_usd?: number
          estimated_total_cost_usd?: number
          estimated_transcription_cost_usd?: number
          estimated_tts_cost_usd?: number
          id?: string
          raw_client_payload?: Json
          raw_realtime_usage?: Json
          raw_transcription_usage?: Json
          raw_tts_usage?: Json
          realtime_cached_audio_tokens?: number
          realtime_cached_text_tokens?: number
          realtime_input_audio_tokens?: number
          realtime_input_text_tokens?: number
          realtime_model?: string | null
          realtime_output_audio_tokens?: number
          realtime_output_text_tokens?: number
          route_intent?: string | null
          route_mode?: string | null
          session_id?: string | null
          started_at?: string
          total_tokens?: number
          transcription_input_audio_tokens?: number
          transcription_input_text_tokens?: number
          transcription_model?: string | null
          transcription_output_text_tokens?: number
          turn_id?: string
          turn_index?: number
          updated_at?: string
          user_id?: string
          user_transcript?: string
          voice_id?: string | null
          voice_name?: string | null
          voice_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtime_voice_turn_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "realtime_voice_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          media_url: string | null
          posted_at: string | null
          scheduled_at: string
          status: string
          thread_mode: boolean
          updated_at: string
          user_id: string
          x_post_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_url?: string | null
          posted_at?: string | null
          scheduled_at: string
          status?: string
          thread_mode?: boolean
          updated_at?: string
          user_id: string
          x_post_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_url?: string | null
          posted_at?: string | null
          scheduled_at?: string
          status?: string
          thread_mode?: boolean
          updated_at?: string
          user_id?: string
          x_post_id?: string | null
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          product: string | null
          refresh_token: string | null
          scope: string | null
          spotify_email: string | null
          spotify_user_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_identifier: string
        }
        Insert: {
          access_token: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          product?: string | null
          refresh_token?: string | null
          scope?: string | null
          spotify_email?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier: string
        }
        Update: {
          access_token?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          product?: string | null
          refresh_token?: string | null
          scope?: string | null
          spotify_email?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_identifier?: string
        }
        Relationships: []
      }
      team_signatures: {
        Row: {
          email: string
          id: string
          intern_id: string
          signed_at: string
          signed_name: string
        }
        Insert: {
          email: string
          id?: string
          intern_id: string
          signed_at?: string
          signed_name: string
        }
        Update: {
          email?: string
          id?: string
          intern_id?: string
          signed_at?: string
          signed_name?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          chat_count: number
          day: string
          delegate_count: number
          month: string
          recording_seconds: number
          updated_at: string
          user_id: string
          voice_seconds: number
        }
        Insert: {
          chat_count?: number
          day?: string
          delegate_count?: number
          month?: string
          recording_seconds?: number
          updated_at?: string
          user_id: string
          voice_seconds?: number
        }
        Update: {
          chat_count?: number
          day?: string
          delegate_count?: number
          month?: string
          recording_seconds?: number
          updated_at?: string
          user_id?: string
          voice_seconds?: number
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
      voice_command_urls: {
        Row: {
          command_id: string
          created_at: string
          id: string
          position: number
          url: string
        }
        Insert: {
          command_id: string
          created_at?: string
          id?: string
          position?: number
          url: string
        }
        Update: {
          command_id?: string
          created_at?: string
          id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_command_urls_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "voice_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_commands: {
        Row: {
          created_at: string
          id: string
          mode_id: string
          open_mode: string
          phrase: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode_id: string
          open_mode?: string
          phrase: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode_id?: string
          open_mode?: string
          phrase?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_commands_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "voice_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_modes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_hidden: boolean
          name: string
          notch_color: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          name: string
          notch_color?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          name?: string
          notch_color?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          context: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
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
      x_auto_reply_logs: {
        Row: {
          discovered_at: string
          error_message: string | null
          id: string
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
      x_auto_sessions: {
        Row: {
          cooldown_ends_at: string
          created_at: string
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
          cooldown_ends_at: string
          created_at?: string
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
          cooldown_ends_at?: string
          created_at?: string
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
      x_automation_stats: {
        Row: {
          created_at: string
          id: string
          last_run_duration_ms: number
          last_run_finished_at: string | null
          last_run_reply_count: number
          last_run_started_at: string | null
          total_replies: number
          total_runs: number
          total_runtime_ms: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_run_duration_ms?: number
          last_run_finished_at?: string | null
          last_run_reply_count?: number
          last_run_started_at?: string | null
          total_replies?: number
          total_runs?: number
          total_runtime_ms?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_run_duration_ms?: number
          last_run_finished_at?: string | null
          last_run_reply_count?: number
          last_run_started_at?: string | null
          total_replies?: number
          total_runs?: number
          total_runtime_ms?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      x_connections: {
        Row: {
          access_token: string
          access_token_secret: string | null
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
          access_token_secret?: string | null
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
          access_token_secret?: string | null
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
      x_follower_snapshots: {
        Row: {
          captured_on: string
          created_at: string
          followers_count: number
          user_id: string
        }
        Insert: {
          captured_on?: string
          created_at?: string
          followers_count: number
          user_id: string
        }
        Update: {
          captured_on?: string
          created_at?: string
          followers_count?: number
          user_id?: string
        }
        Relationships: []
      }
      x_oauth_request_tokens: {
        Row: {
          created_at: string
          id: string
          oauth_token: string
          oauth_token_secret: string
          user_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          oauth_token: string
          oauth_token_secret: string
          user_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          oauth_token?: string
          oauth_token_secret?: string
          user_identifier?: string
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
      x_post_analytics: {
        Row: {
          bookmark_count: number
          fetched_at: string
          like_count: number
          quote_count: number
          reply_count: number
          retweet_count: number
          tweet_id: string
          user_id: string
        }
        Insert: {
          bookmark_count?: number
          fetched_at?: string
          like_count?: number
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          tweet_id: string
          user_id: string
        }
        Update: {
          bookmark_count?: number
          fetched_at?: string
          like_count?: number
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          tweet_id?: string
          user_id?: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
