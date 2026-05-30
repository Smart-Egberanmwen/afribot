import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.contacts.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.contacts.findOne(tenantId, id);
  }

  @Put(':id')
  update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.contacts.update(tenantId, id, dto);
  }
}
