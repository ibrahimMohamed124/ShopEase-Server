import { OrderResponseDto } from '../../orders/dto/order-response.dto';

// POST /orders — CheckoutService.placeOrder() في الفلاتر بيدور على
// response['order'] ?? response['data'] ?? response (checkout_service.dart).
// بنغلفها تحت 'order' زي GET /orders/:id بالظبط عشان تفضل شكل الـresponse
// متسقة في المشروع كله — نفس OrderResponseDto المستخدمة في مديول orders
export interface CheckoutResponseDto {
  order: OrderResponseDto;
}
