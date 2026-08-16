// Order.fromJson / OrderItem.fromJson في الفلاتر (lib/models/order.dart)
// بتقرا بالظبط الحقول دي: id/_id, date, total, status, items[] (كل عنصر
// فيه productId/product_id, name, imageUrl/image_url, price, quantity).
// بنبعتها هنا صريحة بالأسماء الأساسية (id مش _id، imageUrl مش image_url)
// عشان مايعتمدش على fallback زي ProductResponse في products.service.ts
export interface OrderItemResponseDto {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface OrderResponseDto {
  id: string;
  date: string;
  total: number;
  // lowercase دايمًا ('processing' | 'shipped' | 'delivered' | 'cancelled')
  // — الفلاتر بتعمل toLowerCase() قبل ما تقارن، فمينفعش يفرق، بس بنبعتها
  // كده عشان تبقى واضحة لأي client تاني من غير ما يحتاج يعمل normalize
  status: string;
  items: OrderItemResponseDto[];
}
