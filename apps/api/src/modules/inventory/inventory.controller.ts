import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('products')
  getProducts(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.inventory.getProducts(tenantId, q);
  }

  @Post('products')
  createProduct(@Param('tenantId') tenantId: string, @Body() dto: any) {
    return this.inventory.createProduct(tenantId, dto);
  }

  @Put('products/:productId')
  updateProduct(@Param('tenantId') tenantId: string, @Param('productId') productId: string, @Body() dto: any) {
    return this.inventory.updateProduct(tenantId, productId, dto);
  }

  @Get('report')
  getReport(@Param('tenantId') tenantId: string) {
    return this.inventory.getInventoryReport(tenantId);
  }

  @Get('alerts')
  getAlerts(@Param('tenantId') tenantId: string) {
    return this.inventory.getLowStockAlerts(tenantId);
  }

  @Post('restock')
  restock(
    @Param('tenantId') tenantId: string,
    @Body() dto: { productId: string; quantity: number; notes?: string },
  ) {
    return this.inventory.restockProduct(tenantId, dto.productId, dto.quantity, dto.notes);
  }
}
