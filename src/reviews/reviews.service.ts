import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsRepository, ReviewRecord } from './reviews.repository';
import { ProductsRepository } from '../products/products.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { SafeUser } from '../auth/auth.service';

export interface ReviewResponse {
  id: string;
  productId: string;
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

    // TODO: مفيش Orders module لسه نتحقق بيه إن اليوزر فعلًا اشترى المنتج،
    // فـverified بتفضل false لحد ما نضيف ربط حقيقي بسجل الطلبات
    const review = await this.reviewsRepository.create({
      productId,
      userId: user.id,
      name: user.name,
      rating: dto.rating,
      text: dto.text,
      verified: false,
    });

    // بنحدّث rating/reviewCount المخزّنة على المنتج نفسه — ده اللي بيخلي
    // الاتنين "مربوطين" بمعنى إن أي review جديدة بتنعكس فورًا في response
    // الـproduct من غير ما نعمل aggregate على كل GET /products
    await this.refreshProductRatingSummary(productId);

    return this.toResponse(review);
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
      name: review.name,
      rating: review.rating,
      date: review.createdAt.toISOString(),
      text: review.text,
      verified: review.verified,
      helpfulCount: review.helpfulCount,
    };
  }
}
