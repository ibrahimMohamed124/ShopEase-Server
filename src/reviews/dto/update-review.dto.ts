import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// نفس قواعد CreateReviewDto بالظبط، بس كل حقل IsOptional هنا عشان
// المستخدم يقدر يعدّل الـrating بس أو الـtext بس من غير ما يبعت الاتنين
export class UpdateReviewDto {
  @IsOptional()
  @IsInt({ message: 'rating must be a whole number' })
  @Min(1, { message: 'rating must be between 1 and 5' })
  @Max(5, { message: 'rating must be between 1 and 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Review text must be at least 2 characters' })
  @MaxLength(2000, { message: 'Review text must be under 2000 characters' })
  text?: string;
}
