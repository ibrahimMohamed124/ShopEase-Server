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

  // [جديد] — ISO string زي `date` بالظبط (الفلاتر مش بتعمل parsing، بتعرضها
  // كـtext خام زي ما هي). null لو الأوردر اتلغى أو اتسلم بالفعل (مفيش معنى
  // لـ"estimated" وقتها) — computed من createdAt، مش column مخزّن.
  estimatedDelivery: string | null;

  // [جديد] — من deliveredAt column، null لحد ما status يبقى DELIVERED فعليًا
  deliveredDate: string | null;

  // [جديد] — ⚠️ ده مش نفس PaymentMethod model اللي في payment_methods_screen.dart
  // (مفيش lastFour/expiry/holderName هنا خالص — الباك اند مش بيخزن تفاصيل
  // كارت حقيقية، ده مش نظام دفع حقيقي متكامل مع أي payment processor).
  // القيمة دي بس string خام من enum الـcheckout: 'card' | 'paypal' | 'cod'
  // (شوف src/checkout/dto/payment-method.dto.ts). الفلاتر لازم تتعدّل عشان
  // تستقبل النوع البسيط ده بدل object كامل — اتقال في آخر الرد.
  paymentMethod: string;
}
