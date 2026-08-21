// بيقابل OrderTracking.fromJson / TrackingStep.fromJson في الفلاتر
// (lib/models/order_tracking.dart) بالظبط.
//
// [ملاحظة مهمة] — مفيش نظام شحن/لوجستيات حقيقي متكامل هنا (لا courier API
// ولا rastreamento حقيقي). trackingNumber بيتولد deterministically من
// الـorder id (نفس القيمة كل مرة، مش عشوائي)، وcourier قيمة ثابتة واحدة
// لكل المنصة. الخطوات (steps) مبنية على status + shippedAt/deliveredAt
// الحقيقيين المخزّنين، مش تواريخ وهمية. لو حبينا لاحقًا ندمج شركة شحن
// حقيقية، المكان الطبيعي للتعديل هو OrdersService.buildTrackingSteps().
export interface TrackingStepResponseDto {
  title: string;
  description: string | null;
  timestamp: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface OrderTrackingResponseDto {
  orderId: string;
  trackingNumber: string;
  courier: string;
  estimatedDelivery: string | null;
  currentLocation: string | null;
  steps: TrackingStepResponseDto[];
}
