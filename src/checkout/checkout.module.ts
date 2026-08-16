import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutRepository } from './checkout.repository';
import { OrdersModule } from '../orders/orders.module';

// OrdersModule مستورد عشان CheckoutService يستخدم OrdersService.toResponse()
// (نفس الـmapping بتاع GET /orders). PrismaService مش لازم يتحقن هنا لأنه
// @Global() زي باقي المديولز
@Module({
  imports: [OrdersModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, CheckoutRepository],
})
export class CheckoutModule {}
