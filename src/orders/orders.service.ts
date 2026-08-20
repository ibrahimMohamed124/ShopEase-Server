import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/client';
import { OrdersRepository, OrderWithItems } from './orders.repository';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  OrderTrackingResponseDto,
  TrackingStepResponseDto,
} from './dto/order-tracking-response.dto';

// [أمان/business logic] state machine بسيطة للانتقالات المسموحة بين
// حالات الأوردر. من غيرها، updateStatus() كان بيقبل أي OrderStatus من
// الـenum من غير أي تحقق — يعني admin (أو bug في dashboard مستقبلي) كان
// يقدر يرجّع أوردر من DELIVERED لـPENDING أو أي انتقال غير منطقي.
// DELIVERED وCANCELLED terminal states: مفيش رجوع منهم لأي حالة تانية.
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

// [جديد] — مفيش SLA حقيقي متعاقد عليه مع أي شركة شحن، ده رقم تقديري بس
// (5 أيام عمل من وقت الطلب) عشان نعرض "estimated delivery" معقولة للعميل
// لحد ما يتسلّم فعليًا. لو اتضاف شحن حقيقي بعدين، ده أول مكان يتغيّر فيه.
const ESTIMATED_DELIVERY_DAYS = 5;

// [جديد] — مفيش courier حقيقي متكامل، منصة واحدة بس بتشحن كل الأوردرات
const DEFAULT_COURIER = 'ShopEase Express';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  // GET /orders — OrdersService.fetchOrders() في الفلاتر (orders_service.dart)
  async findAllForUser(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.ordersRepository.findAllForUser(userId);
    return orders.map((order) => this.toResponse(order));
  }

  // GET /orders/:id — OrdersService.fetchOrderById() في الفلاتر بتلقط الـ404
  // (e.isNotFound) وترجع null بهدوء بدل ما تعرض error، فمهم نرمي
  // NotFoundException هنا زي AddressesService.getMyAddress بالظبط
  async findOneForUser(userId: string, id: string): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOneForUser(userId, id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.toResponse(order);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const current = await this.ordersRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Order not found');
    }

    // نفس الحالة الحالية مش "انتقال" — بنسمح بيها كـno-op (idempotent) بدل
    // ما نرميها كـinvalid transition.
    if (current.status !== status) {
      const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[current.status];
      if (!allowedNextStatuses.includes(status)) {
        throw new BadRequestException(
          `Cannot transition order from ${current.status} to ${status}`,
        );
      }
    }

    // [جديد] — بنسجل shippedAt/deliveredAt أول مرة بس الأوردر يوصل للحالة
    // دي فعليًا (مش بنكتب فوقهم تاني لو حد عمل نداء idempotent بنفس
    // الحالة)، عشان تفضل التواريخ دي حقيقية ومايتغيّروش بالغلط
    const extraData: { shippedAt?: Date; deliveredAt?: Date } = {};
    if (status === OrderStatus.SHIPPED && !current.shippedAt) {
      extraData.shippedAt = new Date();
    }
    if (status === OrderStatus.DELIVERED && !current.deliveredAt) {
      extraData.deliveredAt = new Date();
    }

    const order = await this.ordersRepository.updateStatus(
      id,
      status,
      extraData,
    );
    return this.toResponse(order);
  }

  // [جديد] — PATCH /orders/:id/cancel: العميل بيلغي أوردره هو (مش أي أوردر
  // زي updateStatus فوق اللي أدمن بس). بنستخدم findOneForUser (نفس اللي GET
  // /orders/:id بيستخدمه) عشان نتأكد إن الأوردر ده بتاع نفس اليوزر أصلًا —
  // من غيرها أي يوزر يعرف id أوردر حد تاني كان يقدر يلغيه.
  // مسموح بس لو لسه PROCESSING (زي Order.isCancellable في الفلاتر بالظبط)؛
  // أوردر اتشحن أو اتسلم أو اتلغى بالفعل، العميل مايقدرش يلغيه من هنا —
  // ده قرار عمدًا أضيق من ALLOWED_STATUS_TRANSITIONS اللي فوق (اللي بتسمح
  // للأدمن يلغي حتى SHIPPED)، لأن ده self-service مش admin action.
  async cancelForUser(
    userId: string,
    id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOneForUser(userId, id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        'Only orders that are still processing can be cancelled.',
      );
    }

    const updated = await this.ordersRepository.updateStatus(
      id,
      OrderStatus.CANCELLED,
    );
    return this.toResponse(updated);
  }

  // [جديد] — GET /orders/:id/tracking. نفس ownership check بتاع findOneForUser
  // (العميل بس يقدر يتتبع أوردره هو)، وبعدين بنبني timeline من الحالة الحالية
  // + shippedAt/deliveredAt الحقيقيين. مفيش "Out for Delivery" كخطوة منفصلة
  // عمدًا — مفيش state حقيقي بيتخزن عن اللحظة دي، وإضافتها كانت هتبقى تاريخ
  // وهمي مش مبني على بيانات فعلية.
  async getTracking(
    userId: string,
    id: string,
  ): Promise<OrderTrackingResponseDto> {
    const order = await this.ordersRepository.findOneForUser(userId, id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      trackingNumber: this.buildTrackingNumber(order.id),
      courier: DEFAULT_COURIER,
      estimatedDelivery: this.computeEstimatedDelivery(order),
      currentLocation: null, // مفيش logistics API حقيقي بيدّينا الموقع اللحظي
      steps: this.buildTrackingSteps(order),
    };
  }

  private buildTrackingSteps(order: OrderWithItems): TrackingStepResponseDto[] {
    if (order.status === OrderStatus.CANCELLED) {
      return [
        {
          title: 'Order Placed',
          description: null,
          timestamp: order.createdAt.toISOString(),
          isCompleted: true,
          isCurrent: false,
        },
        {
          title: 'Order Cancelled',
          description: null,
          timestamp: order.updatedAt.toISOString(),
          isCompleted: true,
          isCurrent: true,
        },
      ];
    }

    const isShippedOrLater =
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED;
    const isDelivered = order.status === OrderStatus.DELIVERED;

    return [
      {
        title: 'Order Placed',
        description: 'We received your order.',
        timestamp: order.createdAt.toISOString(),
        isCompleted: true,
        isCurrent: false,
      },
      {
        title: 'Processing',
        description: 'Preparing your items for shipment.',
        timestamp: order.createdAt.toISOString(),
        isCompleted: isShippedOrLater,
        isCurrent: order.status === OrderStatus.PROCESSING,
      },
      {
        title: 'Shipped',
        description: 'Your order is on its way.',
        timestamp: order.shippedAt?.toISOString() ?? null,
        isCompleted: isDelivered,
        isCurrent: order.status === OrderStatus.SHIPPED,
      },
      {
        title: 'Delivered',
        description: 'Your order has arrived.',
        timestamp: order.deliveredAt?.toISOString() ?? null,
        isCompleted: isDelivered,
        isCurrent: isDelivered,
      },
    ];
  }

  // نفس الـid ينتج نفس رقم التتبع دايمًا (deterministic)، مش عشوائي —
  // من غير ما نحتاج نخزّن أي عمود جديد في الداتابيز لبيانات مش حقيقية أصلًا
  private buildTrackingNumber(orderId: string): string {
    const suffix = orderId.slice(-8).toUpperCase();
    return `TRK-${suffix}`;
  }

  private computeEstimatedDelivery(order: OrderWithItems): string | null {
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      return null;
    }
    const estimated = new Date(order.createdAt);
    estimated.setDate(estimated.getDate() + ESTIMATED_DELIVERY_DAYS);
    return estimated.toISOString();
  }

  // public عشان CheckoutService (مديول تاني) يستخدمها كمان — response الـ
  // POST /orders لازم يفضل بنفس شكل response الـGET بالظبط، مصدر واحد
  // للـmapping بدل ما يتكرر في المكانين
  toResponse(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.id,
      date: order.createdAt.toISOString(),
      total: Number(order.total),
      status: order.status.toLowerCase(),
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        price: Number(item.price),
        quantity: item.quantity,
      })),
      estimatedDelivery: this.computeEstimatedDelivery(order),
      deliveredDate: order.deliveredAt?.toISOString() ?? null,
      paymentMethod: order.paymentMethod,
    };
  }
}
