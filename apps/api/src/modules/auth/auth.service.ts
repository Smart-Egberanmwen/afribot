import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../config/supabase.service';

import { EmailService } from '../notifications/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: { email: string; password: string; fullName: string; tenantId?: string }) {
    // Check if user exists
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.tenantId ? 'client_admin' : 'agency_admin';
    const tenantId = dto.tenantId || '00000000-0000-0000-0000-000000000001';

    const { data: user, error } = await this.supabase.client
      .from('users')
      .insert({
        email: dto.email,
        full_name: dto.fullName,
        password_hash: passwordHash,
        tenant_id: tenantId,
        role: role,
      })
      .select('id, email, full_name, role, tenant_id')
      .single();

    if (error) throw new Error(error.message);

    // Send welcome email (async/non-blocking)
    this.emailService.sendWelcomeEmail({
      to: user.email,
      name: user.full_name,
      agencyName: 'AfriBot Agency',
      loginUrl: `${this.config.get('WEB_URL', 'https://kmlautomatedassistant.vercel.app')}/login`,
    }).catch(err => this.logger.error(`Welcome email failed for ${user.email}: ${err.message}`));

    return this.issueTokens(user);
  }

  async login(dto: { email: string; password: string }) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('id, email, full_name, role, tenant_id, password_hash, is_active')
      .eq('email', dto.email)
      .single();

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.password_hash || '');
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.supabase.client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    this.logger.log(`Login: ${user.email} (${user.role})`);
    return this.issueTokens(user);
  }

  async validateToken(payload: any) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('id, email, role, tenant_id, is_active')
      .eq('id', payload.sub)
      .single();

    if (!user || !user.is_active) return null;
    return user;
  }

  async getProfile(userId: string) {
    const { data } = await this.supabase.client
      .from('users')
      .select('id, email, full_name, role, tenant_id, avatar_url, last_login_at, created_at')
      .eq('id', userId)
      .single();
    return data;
  }

  private issueTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES_IN', '30d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    };
  }
}
