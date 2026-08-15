import { ProductResponse } from '../../products/products.service';

// CartItem.fromJson في الفلاتر بيقرا {product: {...}, quantity: int} —
// مفيش أي مفاتيح تانية، والـquantity لازم يكون رقم JSON فعلي مش string
export interface CartItemResponseDto {
  product: ProductResponse;
  quantity: number;
}
