import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORDER_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

// [ملاحظة] — إنشاء الأوردر (creation) مش هنا عمدًا، بل جوه
// CheckoutRepository (src/checkout/checkout.repository.ts): الإنشاء
// لازم يحصل جوه نفس الـtransaction اللي بتتحقق من الستوك وتخصمه، فمكانه
// الطبيعي هو مديول checkout اللي "بيملك" عملية الكتابة دي. المديول ده
// (orders) بيملك القراءة والتحديثات بعد ما الأوردر يتعمل.
@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // GET /orders — لازم يرجع أحدث أوردر الأول
  findAllForUser(userId: string): Promise<OrderWithItems[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // GET /orders/:id — findFirst بشرط userId كمان (مش findUnique بـid بس)
  // عشان يوزر مايقدرش يجيب تفاصيل أوردر يوزر تاني حتى لو عرف الـid بتاعه
  findOneForUser(userId: string, id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    });
  }

  // بيتنادى بس من OrdersService.updateStatus() (admin-only route، شوف
  // RolesGuard في OrdersController) عشان نجيب الحالة الحالية للأوردر
  // ونتحقق من صحة الانتقال قبل ما نكتب. من غير userId scoping عمدًا —
  // الأدمن لازم يقدر يدير أي أوردر، على عكس findOneForUser فوق.
  findById(id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  }

  // [تعديل] — بقت بتاخد extraData اختياري عشان تسجل shippedAt/deliveredAt
  // في نفس لحظة تغيير الحالة (بدل ما نحتاج update تاني منفصل). القيمة
  // الافتراضية {} عشان أي نداء قديم لسه شغال زي ما هو من غير أي تعديل.
  updateStatus(
    id: string,
    status: OrderStatus,
    extraData: Prisma.OrderUpdateInput = {},
  ): Promise<OrderWithItems> {
    return this.prisma.order.update({
      where: { id },
      data: { status, ...extraData },
      include: ORDER_INCLUDE,
    });
  }
}
