import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
