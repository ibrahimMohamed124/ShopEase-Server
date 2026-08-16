import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/client';

// PATCH /orders/:id/status — مش مستخدمة من الفلاتر حاليًا (مفيش شاشة admin
// في الابليكيشن، بس OrdersScreen فيها زرار "Track Order"/"Buy Again" ممكن
// تتوصل بمنطق حقيقي بعدين). موجودة عشان أي admin panel/dashboard يقدر
// يحرّك الأوردر بين الحالات (processing -> shipped -> delivered) لاحقًا
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'status must be one of processing, shipped, delivered, cancelled',
  })
  status: OrderStatus;
}
