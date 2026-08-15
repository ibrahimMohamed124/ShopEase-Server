import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// المسار كامل بيبقى /products/:productId/reviews — نفس اللي
// ReviewService.fetchReviews()/submitReview() في الفلاتر بينادوه بالظبط
@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(@Param('productId') productId: string) {
    return this.reviewsService.findAllForProduct(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.create(productId, req.user, dto);
  }
}
