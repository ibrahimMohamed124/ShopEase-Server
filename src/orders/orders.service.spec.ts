import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository, OrderWithItems } from './orders.repository';
import { OrderStatus } from '../../generated/prisma/client';

// [أمان] الاختبارات دي بتتأكد إن OrdersService.updateStatus() بترفض أي
// انتقال حالة مش منطقي (زي DELIVERED -> PROCESSING)، بعد ما كانت بتقبل أي
// OrderStatus من الـenum من غير أي تحقق.
//
// [تعديل] — بعد إضافة shippedAt/deliveredAt، updateStatus() بقت بتنادي
// repository.updateStatus بـ3 arguments مش 2 (id, status, extraData).
// makeOrder() بقت بتاخد shippedAt/deliveredAt اختياريين عشان تحاكي أوردر
// "اتشحن بالفعل من قبل" في اختبار الـidempotency تحت.
//
// [تعديل] — بقت بتاخد items اختيارية كمان عشان اختبارات restock تحت
// (استعادة الستوك عند الإلغاء) تقدر تحاكي أوردر عنده عناصر حقيقية.
function makeOrder(
  status: OrderStatus,
  extra: Partial<
    Pick<OrderWithItems, 'shippedAt' | 'deliveredAt' | 'items'>
  > = {},
): OrderWithItems {
  return {
    id: 'order-1',
    userId: 'user-1',
    status,
    total: 100 as unknown as OrderWithItems['total'],
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    shippedAt: null,
    deliveredAt: null,
    ...extra,
  } as unknown as OrderWithItems;
}

const SAMPLE_ITEMS = [
  { productId: 'prod-1', quantity: 2 },
  { productId: 'prod-2', quantity: 1 },
] as unknown as OrderWithItems['items'];

describe('OrdersService.updateStatus', () => {
  let repository: jest.Mocked<
    Pick<OrdersRepository, 'findById' | 'updateStatus'>
  >;
  let service: OrdersService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    service = new OrdersService(repository as unknown as OrdersRepository);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.updateStatus('missing', OrderStatus.SHIPPED),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('allows PROCESSING -> SHIPPED and stamps shippedAt', async () => {
    repository.findById.mockResolvedValue(makeOrder(OrderStatus.PROCESSING));
    repository.updateStatus.mockResolvedValue(
      makeOrder(OrderStatus.SHIPPED, { shippedAt: new Date() }),
    );

    await service.updateStatus('order-1', OrderStatus.SHIPPED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.SHIPPED,
      { shippedAt: expect.any(Date) },
      undefined,
    );
  });

  // [جديد] — لما الأدمن يلغي أوردر، لازم الستوك يترجع. الاختبار ده بيتأكد
  // إن OrdersService بيبعت restockItems لـrepository.updateStatus مبنية
  // بالظبط على current.items (productId + quantity)، مش أي مصدر تاني —
  // ده اللي بيضمن إن اللي بيترجع هو بالظبط اللي اتخصم وقت الـcheckout.
  it('allows PROCESSING -> CANCELLED, does not touch shippedAt/deliveredAt, and restocks items', async () => {
    repository.findById.mockResolvedValue(
      makeOrder(OrderStatus.PROCESSING, { items: SAMPLE_ITEMS }),
    );
    repository.updateStatus.mockResolvedValue(
      makeOrder(OrderStatus.CANCELLED),
    );

    await service.updateStatus('order-1', OrderStatus.CANCELLED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.CANCELLED,
      {},
      [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
    );
  });

  it('allows SHIPPED -> DELIVERED and stamps deliveredAt', async () => {
    repository.findById.mockResolvedValue(
      makeOrder(OrderStatus.SHIPPED, { shippedAt: new Date() }),
    );
    repository.updateStatus.mockResolvedValue(
      makeOrder(OrderStatus.DELIVERED, {
        shippedAt: new Date(),
        deliveredAt: new Date(),
      }),
    );

    await service.updateStatus('order-1', OrderStatus.DELIVERED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.DELIVERED,
      { deliveredAt: expect.any(Date) },
      undefined,
    );
  });

  it('rejects DELIVERED -> PROCESSING', async () => {
    repository.findById.mockResolvedValue(makeOrder(OrderStatus.DELIVERED));

    await expect(
      service.updateStatus('order-1', OrderStatus.PROCESSING),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects CANCELLED -> SHIPPED', async () => {
    repository.findById.mockResolvedValue(makeOrder(OrderStatus.CANCELLED));

    await expect(
      service.updateStatus('order-1', OrderStatus.SHIPPED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects PROCESSING -> DELIVERED (skipping SHIPPED)', async () => {
    repository.findById.mockResolvedValue(makeOrder(OrderStatus.PROCESSING));

    await expect(
      service.updateStatus('order-1', OrderStatus.DELIVERED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('treats setting the same status as a no-op (idempotent) and does not re-stamp shippedAt', async () => {
    const alreadyShipped = makeOrder(OrderStatus.SHIPPED, {
      shippedAt: new Date(),
    });
    repository.findById.mockResolvedValue(alreadyShipped);
    repository.updateStatus.mockResolvedValue(alreadyShipped);

    await service.updateStatus('order-1', OrderStatus.SHIPPED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.SHIPPED,
      {},
      undefined,
    );
  });

  // [جديد] — re-cancelling an already-CANCELLED order (idempotent no-op,
  // نفس فكرة اختبار SHIPPED فوق) لازم ميرجعش الستوك تاني — current.status
  // بالفعل CANCELLED فبنعدي على `if (current.status !== status)` من غير
  // ما نلمس الـstatus أو نحسب restockItems أصلًا.
  it('treats re-cancelling an already-cancelled order as a no-op and does not restock', async () => {
    const alreadyCancelled = makeOrder(OrderStatus.CANCELLED, {
      items: SAMPLE_ITEMS,
    });
    repository.findById.mockResolvedValue(alreadyCancelled);
    repository.updateStatus.mockResolvedValue(alreadyCancelled);

    await service.updateStatus('order-1', OrderStatus.CANCELLED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.CANCELLED,
      {},
      undefined,
    );
  });
});

describe('OrdersService.cancelForUser', () => {
  let repository: jest.Mocked<
    Pick<OrdersRepository, 'findOneForUser' | 'updateStatus'>
  >;
  let service: OrdersService;

  beforeEach(() => {
    repository = {
      findOneForUser: jest.fn(),
      updateStatus: jest.fn(),
    };
    service = new OrdersService(repository as unknown as OrdersRepository);
  });

  it('throws NotFoundException when the order does not belong to the user', async () => {
    repository.findOneForUser.mockResolvedValue(null);

    await expect(
      service.cancelForUser('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects cancelling an order that is no longer PROCESSING', async () => {
    repository.findOneForUser.mockResolvedValue(
      makeOrder(OrderStatus.SHIPPED, { items: SAMPLE_ITEMS }),
    );

    await expect(
      service.cancelForUser('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  // [جديد] — العميل بيلغي أوردره وهو لسه PROCESSING؛ لازم الستوك يترجع
  // بنفس الكميات اللي في order.items، بالظبط زي مسار الأدمن فوق.
  it('cancels a PROCESSING order and restocks its items', async () => {
    const order = makeOrder(OrderStatus.PROCESSING, { items: SAMPLE_ITEMS });
    repository.findOneForUser.mockResolvedValue(order);
    repository.updateStatus.mockResolvedValue(
      makeOrder(OrderStatus.CANCELLED),
    );

    await service.cancelForUser('user-1', 'order-1');
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.CANCELLED,
      {},
      [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
    );
  });
});
