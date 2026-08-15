import { IsInt, IsPositive, Max } from 'class-validator';

// الفلاتر بتضمن إن quantity هنا دايمًا >= 1 قبل ما تبعت PATCH — لو
// وصلت لصفر بتعمل removeFromCart (DELETE) بدل كده من عندها هي
export class UpdateCartItemDto {
  @IsInt({ message: 'quantity must be a whole number' })
  @IsPositive({ message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity must be 99 or less' })
  quantity: number;
}
