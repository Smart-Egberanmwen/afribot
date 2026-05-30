import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface StockCheckResult {
  available: boolean;
  quantity: number;
  product: any;
}

interface StockDeductResult {
  success: boolean;
  newQuantity: number;
  isLowStock: boolean;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly LOW_STOCK_THRESHOLD_MULTIPLIER = 1.5; // alert at 1.5x reorder_point

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---- Product CRUD ----

  async getProducts(tenantId: string, filters: {
    categoryId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20, search, categoryId, isActive = true } = filters;

    let query = this.supabase.client
      .from('products')
      .select(`
        *,
        inventory(*),
        product_categories(name)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', isActive)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }

  async createProduct(tenantId: string, dto: {
    name: string;
    sku?: string;
    description?: string;
    price_ngn: number;    // in kobo
    category_id?: string;
    track_inventory?: boolean;
    initial_stock?: number;
    reorder_point?: number;
    image_urls?: string[];
  }) {
    const { data: product, error } = await this.supabase.client
      .from('products')
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        price_ngn: dto.price_ngn,
        category_id: dto.category_id,
        track_inventory: dto.track_inventory ?? true,
        image_urls: dto.image_urls || [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Initialize inventory record
    if (dto.track_inventory !== false) {
      await this.supabase.client
        .from('inventory')
        .insert({
          tenant_id: tenantId,
          product_id: product.id,
          quantity_on_hand: dto.initial_stock || 0,
          reorder_point: dto.reorder_point || 10,
        });

      if (dto.initial_stock && dto.initial_stock > 0) {
        await this.recordMovement(tenantId, product.id, 'restock', dto.initial_stock, 0, 'Initial stock');
      }
    }

    return product;
  }

  // ---- Inventory Operations ----

  async checkStock(tenantId: string, productNameOrId: string): Promise<StockCheckResult> {
    const { data: product } = await this.supabase.client
      .from('products')
      .select('*, inventory(*)')
      .eq('tenant_id', tenantId)
      .or(`id.eq.${productNameOrId},name.ilike.%${productNameOrId}%`)
      .eq('is_active', true)
      .single();

    if (!product) {
      return { available: false, quantity: 0, product: null };
    }

    const inv = product.inventory?.[0];
    const qty = inv?.quantity_available ?? 0;

    return {
      available: qty > 0,
      quantity: qty,
      product,
    };
  }

  async deductStock(
    tenantId: string,
    productId: string,
    quantity: number,
    orderId?: string,
  ): Promise<StockDeductResult> {
    // Get current inventory with lock (use transaction)
    const { data: inv, error } = await this.supabase.client
      .from('inventory')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .single();

    if (error || !inv) throw new NotFoundException('Product inventory not found');

    if (inv.quantity_available < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${inv.quantity_available}, Requested: ${quantity}`
      );
    }

    const newQty = inv.quantity_on_hand - quantity;
    const { error: updateError } = await this.supabase.client
      .from('inventory')
      .update({ quantity_on_hand: newQty })
      .eq('id', inv.id);

    if (updateError) throw new Error(updateError.message);

    await this.recordMovement(tenantId, productId, 'sale', -quantity, inv.quantity_on_hand, undefined, orderId);

    const isLowStock = newQty <= inv.reorder_point * this.LOW_STOCK_THRESHOLD_MULTIPLIER;

    if (isLowStock) {
      this.eventEmitter.emit('inventory.low-stock', {
        tenantId,
        productId,
        currentStock: newQty,
        reorderPoint: inv.reorder_point,
      });
    }

    if (newQty <= 0) {
      this.eventEmitter.emit('inventory.out-of-stock', { tenantId, productId });
    }

    return { success: true, newQuantity: newQty, isLowStock };
  }

  async restockProduct(
    tenantId: string,
    productId: string,
    quantity: number,
    notes?: string,
    userId?: string,
  ) {
    const { data: inv } = await this.supabase.client
      .from('inventory')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .single();

    if (!inv) throw new NotFoundException('Product not found');

    const newQty = inv.quantity_on_hand + quantity;

    await this.supabase.client
      .from('inventory')
      .update({
        quantity_on_hand: newQty,
        last_restocked_at: new Date().toISOString(),
      })
      .eq('id', inv.id);

    await this.recordMovement(tenantId, productId, 'restock', quantity, inv.quantity_on_hand, notes);

    this.eventEmitter.emit('inventory.restocked', {
      tenantId, productId, quantity, newQuantity: newQty,
    });

    return { success: true, previousQuantity: inv.quantity_on_hand, newQuantity: newQty };
  }

  async getLowStockAlerts(tenantId: string) {
    const { data } = await this.supabase.client
      .from('inventory')
      .select(`
        *,
        products(name, sku, image_urls, price_ngn)
      `)
      .eq('tenant_id', tenantId)
      .filter('quantity_available', 'lte', 'reorder_point')
      .order('quantity_available');

    return data || [];
  }

  async getInventoryReport(tenantId: string) {
    const { data: inventory } = await this.supabase.client
      .from('inventory')
      .select(`
        *,
        products(name, sku, price_ngn, category_id, product_categories(name))
      `)
      .eq('tenant_id', tenantId)
      .order('quantity_available');

    const totalStockValue = inventory?.reduce((sum: number, item: any) => {
      return sum + (item.quantity_on_hand * (item.products?.price_ngn || 0));
    }, 0) || 0;

    const outOfStock = inventory?.filter((i: any) => i.quantity_available <= 0).length || 0;
    const lowStock = inventory?.filter((i: any) =>
      i.quantity_available > 0 && i.quantity_available <= i.reorder_point
    ).length || 0;

    return {
      summary: {
        totalProducts: inventory?.length || 0,
        outOfStock,
        lowStock,
        totalStockValueNgn: totalStockValue,
      },
      items: inventory || [],
    };
  }

  // ---- Internal Helpers ----

  private async recordMovement(
    tenantId: string,
    productId: string,
    type: string,
    quantity: number,
    quantityBefore: number,
    notes?: string,
    orderId?: string,
  ) {
    await this.supabase.client.from('inventory_movements').insert({
      tenant_id: tenantId,
      product_id: productId,
      type,
      quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityBefore + quantity,
      order_id: orderId,
      notes,
    });
  }

  async updateProduct(tenantId: string, productId: string, dto: any) {
    const { data } = await this.supabase.client
      .from('products')
      .update(dto)
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .select()
      .single();
    return data;
  }
}
