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
function makeOrder(
  status: OrderStatus,
  extra: Partial<Pick<OrderWithItems, 'shippedAt' | 'deliveredAt'>> = {},
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
    );
  });

  it('allows PROCESSING -> CANCELLED without touching shippedAt/deliveredAt', async () => {
    repository.findById.mockResolvedValue(makeOrder(OrderStatus.PROCESSING));
    repository.updateStatus.mockResolvedValue(
      makeOrder(OrderStatus.CANCELLED),
    );

    await service.updateStatus('order-1', OrderStatus.CANCELLED);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.CANCELLED,
      {},
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
    );
  });
});
