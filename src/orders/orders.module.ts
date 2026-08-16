import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

// exports: OrdersService عشان CheckoutModule يستخدم toResponse() (نفس
// شكل الـresponse للقراءة والكتابة)، وOrdersRepository عشان checkout.repository.ts
// يستخدم OrderWithItems/ORDER_INCLUDE type من نفس المكان
@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
