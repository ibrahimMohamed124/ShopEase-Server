import { IsNotEmpty, IsString } from 'class-validator';

// WishlistService.addToWishlist() في الفلاتر بيبعت body: {'productId': productId} بس
export class AddToWishlistDto {
  @IsString()
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;
}
