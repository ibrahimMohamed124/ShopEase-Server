import { IsInt, IsNotEmpty, IsPositive, IsString, Max } from 'class-validator';

// CartRepository.addToCart() في الفلاتر دايمًا بيبعت quantity: 1 لمنتج جديد
// (لو المنتج موجود بالفعل، الفلاتر بتستخدم updateQuantity/PATCH بدل كده) —
// بس سايبها required زي ما الـservice بتاعتها بالظبط بتبعتها
export class AddToCartDto {
  @IsString()
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;

  @IsInt({ message: 'quantity must be a whole number' })
  @IsPositive({ message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity must be 99 or less' })
  quantity: number;
}
