import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.ts';

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

  @UseGuards(JwtAuthGuard)
  @Patch(':reviewId')
  update(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.update(productId, reviewId, req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.reviewsService.remove(productId, reviewId, req.user);
  }
}
