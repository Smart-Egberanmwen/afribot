import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (agency admin only)' })
  findAll(@Query() query: { status?: string; page?: number; limit?: number }) {
    return this.tenants.findAll(query);
  }

  @Get('agency-overview')
  @ApiOperation({ summary: 'Agency-wide KPI dashboard' })
  agencyOverview() {
    return this.tenants.getAgencyOverview();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.tenants.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new client/tenant' })
  create(@Body() dto: {
    name: string; slug: string; businessType?: string;
    subscriptionPlan?: string; monthlyFeeNgn?: number;
  }) {
    return this.tenants.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.tenants.update(id, dto);
  }

  @Post(':id/whatsapp-accounts')
  @ApiOperation({ summary: 'Add WhatsApp Business number to tenant' })
  addWhatsApp(@Param('id') id: string, @Body() dto: any) {
    return this.tenants.addWhatsAppAccount(id, dto);
  }
}
