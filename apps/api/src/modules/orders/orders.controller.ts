import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.orders.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.orders.findOne(tenantId, id);
  }

  @Put(':id/status')
  updateStatus(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: { status: string }) {
    return this.orders.updateStatus(tenantId, id, body.status);
  }
}
