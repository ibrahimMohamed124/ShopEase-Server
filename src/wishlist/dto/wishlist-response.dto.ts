import { ProductResponse } from '../../products/products.service';

// كل عنصر في الـwishlist بيرجع بنفس شكل ProductResponse تمامًا — الفلاتر
// بتعمل Product.fromJson() على كل عنصر مباشرة من غير أي غلاف (WishlistService
// بيقرا الـresponse كـList<dynamic> مباشرة، مش تحت key زي 'wishlist'/'data')
export type WishlistItemResponseDto = ProductResponse;
