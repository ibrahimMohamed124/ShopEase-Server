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
  //
  // [تعديل] — بقت بتاخد restockItems اختياري كمان. لو موجودة (يعني
  // OrdersService قرر إن الانتقال ده لـCANCELLED فعلي، مش no-op)، بنرجّع
  // الستوك جوه *نفس* الـtransaction اللي بتغيّر الحالة — بالظبط عكس اللي
  // CheckoutRepository.createOrder() بيعمله وقت الخصم. لو أي خطوة فشلت
  // (مثلاً الداتابيز وقعت في النص)، لا الحالة بتتغيّر ولا الستوك بيترجع،
  // فمفيش سيناريو "الأوردر اتلغى بس الستوك فضل ناقص" أو العكس.
  updateStatus(
    id: string,
    status: OrderStatus,
    extraData: Prisma.OrderUpdateInput = {},
    restockItems?: { productId: string; quantity: number }[],
  ): Promise<OrderWithItems> {
    if (!restockItems || restockItems.length === 0) {
      return this.prisma.order.update({
        where: { id },
        data: { status, ...extraData },
        include: ORDER_INCLUDE,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status, ...extraData },
        include: ORDER_INCLUDE,
      });

      for (const item of restockItems) {
        // updateMany بدل update عادي عمدًا: OrderItem.productId عمود
        // عادي مش FK حقيقي لـProduct (شوف الكومنت في schema.prisma) —
        // المنتج ممكن يكون اتحذف خالص بعد ما الأوردر اتعمل. update()
        // العادي كان هيرمي P2025 (record not found) ويفشّل الـtransaction
        // كلها بسبب منتج واحد محذوف؛ updateMany على where بيرجع 0 صفوف
        // متأثرة بهدوء بدل ما يرمي، فباقي عناصر الأوردر بيترجع ستوكهم عادي.
        await tx.product.updateMany({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            // بعد ما نزوّد الكمية بمقدار اللي كان محجوز للأوردر ده، الستوك
            // مضمون إنه > 0 (كان صفر أو أكتر قبل كده + الكمية دي)، فتحديد
            // inStock=true هنا مباشر وآمن من غير الحاجة لقراءة تانية.
            inStock: true,
          },
        });
      }

      return order;
    });
  }
}
