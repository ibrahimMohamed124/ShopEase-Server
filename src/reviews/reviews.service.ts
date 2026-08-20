import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsRepository, ReviewRecord } from './reviews.repository';
import { ProductsRepository } from '../products/products.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SafeUser } from '../auth/auth.service';

export interface ReviewResponse {
  id: string;
  productId: string;
  userId: string;
  name: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
  helpfulCount: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async findAllForProduct(productId: string): Promise<ReviewResponse[]> {
    await this.ensureProductExists(productId);
    const reviews = await this.reviewsRepository.findByProduct(productId);
    return reviews.map((review) => this.toResponse(review));
  }

  async create(
    productId: string,
    user: SafeUser,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    await this.ensureProductExists(productId);

    const existing = await this.reviewsRepository.findByProductAndUser(
      productId,
      user.id,
    );
    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // [تعديل] — Orders module موجود دلوقتي، فـverified بقت بتتحسب فعليًا:
    // بندوّر إن كان عند نفس اليوزر أوردر وصل لحالة DELIVERED فيه المنتج ده.
    // "طلبه" مش كفاية عمدًا (أوردر لسه PROCESSING أو اتلغى مايأهلش) — لازم
    // يكون استلمه فعليًا، وإلا كان أي حد يقدر يعمل review "verified" بمجرد
    // إنه يحط المنتج في أوردر من غير ما يشتريه فعلاً لحد النهاية.
    const verified = await this.ordersRepository.hasDeliveredOrderForProduct(
      user.id,
      productId,
    );

    const review = await this.reviewsRepository.create({
      productId,
      userId: user.id,
      name: user.name,
      rating: dto.rating,
      text: dto.text,
      verified,
    });

    // بنحدّث rating/reviewCount المخزّنة على المنتج نفسه — ده اللي بيخلي
    // الاتنين "مربوطين" بمعنى إن أي review جديدة بتنعكس فورًا في response
    // الـproduct من غير ما نعمل aggregate على كل GET /products
    await this.refreshProductRatingSummary(productId);

    return this.toResponse(review);
  }

  // بيتأكد إن الـreview موجودة وإن اليوزر الحالي هو صاحبها قبل أي تعديل
  // أو حذف — لو مش هو، بيرمي ForbiddenException بدل ما يسيبه يعدّل/يمسح
  // تعليق حد تاني
  private async ensureOwnedReview(
    reviewId: string,
    productId: string,
    userId: string,
  ): Promise<ReviewRecord> {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review || review.productId !== productId) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only manage your own review');
    }
    return review;
  }

  async update(
    productId: string,
    reviewId: string,
    user: SafeUser,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponse> {
    await this.ensureOwnedReview(reviewId, productId, user.id);

    const updated = await this.reviewsRepository.update(reviewId, {
      ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
      ...(dto.text !== undefined ? { text: dto.text } : {}),
    });

    if (dto.rating !== undefined) {
      await this.refreshProductRatingSummary(productId);
    }

    return this.toResponse(updated);
  }

  async remove(
    productId: string,
    reviewId: string,
    user: SafeUser,
  ): Promise<void> {
    await this.ensureOwnedReview(reviewId, productId, user.id);
    await this.reviewsRepository.delete(reviewId);
    await this.refreshProductRatingSummary(productId);
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async refreshProductRatingSummary(productId: string): Promise<void> {
    const { average, count } =
      await this.reviewsRepository.aggregateForProduct(productId);
    await this.productsRepository.updateRatingSummary(
      productId,
      average,
      count,
    );
  }

  private toResponse(review: ReviewRecord): ReviewResponse {
    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      name: review.name,
      rating: review.rating,
      date: review.createdAt.toISOString(),
      text: review.text,
      verified: review.verified,
      helpfulCount: review.helpfulCount,
    };
  }
}
