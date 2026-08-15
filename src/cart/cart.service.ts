import { Injectable, NotFoundException } from '@nestjs/common';
import { CartRepository, CartItemWithProduct } from './cart.repository';
import { ProductsRepository } from '../products/products.repository';
import { ProductsService } from '../products/products.service';
import { CartItemResponseDto } from './dto/cart-response.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly productsService: ProductsService,
  ) {}

  async findAll(userId: string): Promise<CartItemResponseDto[]> {
    const items = await this.cartRepository.findAllForUser(userId);
    return items.map((item) => this.toResponse(item));
  }

  async add(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItemResponseDto> {
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const item = await this.cartRepository.increment(
      userId,
      productId,
      quantity,
    );
    return this.toResponse(item);
  }

  async update(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItemResponseDto> {
    const existing = await this.cartRepository.findOne(userId, productId);
    if (!existing) {
      throw new NotFoundException('Item not in cart');
    }

    const item = await this.cartRepository.setQuantity(
      userId,
      productId,
      quantity,
    );
    return this.toResponse(item);
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.cartRepository.remove(userId, productId);
  }

  async clear(userId: string): Promise<void> {
    await this.cartRepository.clearAll(userId);
  }

  private toResponse(item: CartItemWithProduct): CartItemResponseDto {
    return {
      product: this.productsService.toResponse(item.product),
      quantity: item.quantity,
    };
  }
}
