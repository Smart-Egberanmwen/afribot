import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupabaseService } from '../../config/supabase.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/ai')
export class AiController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('agent')
  async getAgent(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.client
      .from('ai_agents')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    return data;
  }

  @Put('agent')
  async updateAgent(@Param('tenantId') tenantId: string, @Body() dto: any) {
    const { data } = await this.supabase.client
      .from('ai_agents')
      .upsert({ ...dto, tenant_id: tenantId })
      .select()
      .single();
    return data;
  }

  @Get('knowledge')
  async getKnowledge(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.client
      .from('knowledge_documents')
      .select('id, title, doc_type, is_active, chunk_count, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  @Post('knowledge')
  async addKnowledge(@Param('tenantId') tenantId: string, @Body() dto: { title: string; content: string; docType?: string }) {
    const { data, error } = await this.supabase.client
      .from('knowledge_documents')
      .insert({
        tenant_id: tenantId,
        title: dto.title,
        content: dto.content,
        doc_type: dto.docType || 'faq',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // In production: trigger embedding generation job
    return data;
  }
}
