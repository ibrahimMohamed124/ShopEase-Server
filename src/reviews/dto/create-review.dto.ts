import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// productId جاي من الـroute (/products/:productId/reviews)، والاسم بتاع
// المراجع جاي من اليوزر المسجل دخول (JWT) — مش من الـbody، بالظبط زي ما
// ProductReview.toJson() في الفلاتر بيبعت rating و text بس
export class CreateReviewDto {
  @IsInt({ message: 'rating must be a whole number' })
  @Min(1, { message: 'rating must be between 1 and 5' })
  @Max(5, { message: 'rating must be between 1 and 5' })
  rating: number;

  @IsString()
  @IsNotEmpty({ message: 'text is required' })
  @MinLength(2, { message: 'Review text must be at least 2 characters' })
  @MaxLength(2000, { message: 'Review text must be under 2000 characters' })
  text: string;
}
