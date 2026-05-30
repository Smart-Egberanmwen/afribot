import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.conversations.findAll(tenantId, q);
  }

  @Get(':id/messages')
  getMessages(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversations.getMessages(tenantId, id);
  }

  @Post(':id/handoff')
  handoff(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: { agentId: string }) {
    return this.conversations.resolveHandoff(tenantId, id, body.agentId);
  }

  @Post(':id/resolve')
  resolve(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversations.resolve(tenantId, id);
  }
}
