import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _client: SupabaseClient;
  private _adminClient: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !anonKey) {
      this.logger.warn('Supabase credentials not configured - using mock mode');
      return;
    }

    this._client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    this._adminClient = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.logger.log('Supabase client initialized');
  }

  get client(): SupabaseClient {
    return this._adminClient || this._client;
  }

  get anonClient(): SupabaseClient {
    return this._client;
  }
}
