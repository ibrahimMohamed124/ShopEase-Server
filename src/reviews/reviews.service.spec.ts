import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository, ReviewRecord } from './reviews.repository';
import { ProductsRepository } from '../products/products.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { SafeUser } from '../auth/auth.service';
import { Role } from '../../generated/prisma/client';

// [جديد] — بيتأكد إن ReviewsService.create() بقى بيحسب verified فعليًا
// (بدل ما تفضل false ثابتة زي قبل ما Orders module يتضاف). verified لازم
// تبقى true لو وبس لو عند اليوزر أوردر DELIVERED فيه نفس المنتج —
// "طلبه" بس أو أوردر لسه PROCESSING/CANCELLED مش كفاية.
function makeReview(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: 'review-1',
    productId: 'product-1',
    userId: 'user-1',
    name: 'Test User',
    rating: 5,
    text: 'Great product',
    verified: false,
    helpfulCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ReviewRecord;
}

const USER: SafeUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',
  role: Role.USER,
};

describe('ReviewsService.create', () => {
  let reviewsRepository: jest.Mocked<
    Pick<
      ReviewsRepository,
      'findByProductAndUser' | 'create' | 'aggregateForProduct'
    >
  >;
  let productsRepository: jest.Mocked<Pick<ProductsRepository, 'findById'>>;
  let ordersRepository: jest.Mocked<
    Pick<OrdersRepository, 'hasDeliveredOrderForProduct'>
  >;
  let service: ReviewsService;

  beforeEach(() => {
    reviewsRepository = {
      findByProductAndUser: jest.fn(),
      create: jest.fn(),
      aggregateForProduct: jest.fn(),
    };
    productsRepository = {
      findById: jest.fn(),
    };
    ordersRepository = {
      hasDeliveredOrderForProduct: jest.fn(),
    };

    productsRepository.findById.mockResolvedValue({
      id: 'product-1',
    } as never);
    reviewsRepository.findByProductAndUser.mockResolvedValue(null);
    reviewsRepository.aggregateForProduct.mockResolvedValue({
      average: 5,
      count: 1,
    });

    service = new ReviewsService(
      reviewsRepository as unknown as ReviewsRepository,
      productsRepository as unknown as ProductsRepository,
      ordersRepository as unknown as OrdersRepository,
    );

    // products.repository أيضًا محتاجة updateRatingSummary — بنعرّفها
    // كـno-op هنا عشان refreshProductRatingSummary() متفشلش
    (productsRepository as unknown as ProductsRepository).updateRatingSummary =
      jest.fn().mockResolvedValue(undefined);
  });

  it('marks the review verified when the user has a DELIVERED order for the product', async () => {
    ordersRepository.hasDeliveredOrderForProduct.mockResolvedValue(true);
    reviewsRepository.create.mockResolvedValue(
      makeReview({ verified: true }),
    );

    const result = await service.create('product-1', USER, {
      rating: 5,
      text: 'Great product',
    });

    expect(ordersRepository.hasDeliveredOrderForProduct).toHaveBeenCalledWith(
      'user-1',
      'product-1',
    );
    expect(reviewsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true }),
    );
    expect(result.verified).toBe(true);
  });

  it('marks the review unverified when the user never received the product', async () => {
    ordersRepository.hasDeliveredOrderForProduct.mockResolvedValue(false);
    reviewsRepository.create.mockResolvedValue(
      makeReview({ verified: false }),
    );

    const result = await service.create('product-1', USER, {
      rating: 4,
      text: 'It was okay',
    });

    expect(reviewsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ verified: false }),
    );
    expect(result.verified).toBe(false);
  });

  it('rejects a second review from the same user on the same product', async () => {
    reviewsRepository.findByProductAndUser.mockResolvedValue(makeReview());

    await expect(
      service.create('product-1', USER, { rating: 3, text: 'Again' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ordersRepository.hasDeliveredOrderForProduct).not.toHaveBeenCalled();
    expect(reviewsRepository.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the product does not exist', async () => {
    productsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create('missing-product', USER, { rating: 3, text: 'Hmm' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ordersRepository.hasDeliveredOrderForProduct).not.toHaveBeenCalled();
  });
});
