import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PaystackService } from './paystack.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  providers: [PaystackService],
  controllers: [BillingController],
  exports: [PaystackService],
})
export class BillingModule {}
