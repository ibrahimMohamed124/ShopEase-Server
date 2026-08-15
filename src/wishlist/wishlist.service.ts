import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { ProductsRepository } from '../products/products.repository';
import { ProductsService } from '../products/products.service';
import { WishlistItemResponseDto } from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly productsService: ProductsService,
  ) {}

  async findAll(userId: string): Promise<WishlistItemResponseDto[]> {
    const items = await this.wishlistRepository.findAllForUser(userId);
    return items.map((item) => this.productsService.toResponse(item.product));
  }

  async add(
    userId: string,
    productId: string,
  ): Promise<WishlistItemResponseDto> {
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // idempotent — لو موجود بالفعل، منرجع المنتج عادي من غير error،
    // بيطابق سلوك addProduct/toggle في WishlistRepository بتاع الفلاتر
    const existing = await this.wishlistRepository.findOne(userId, productId);
    if (!existing) {
      await this.wishlistRepository.add(userId, productId);
    }

    return this.productsService.toResponse(product);
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.wishlistRepository.remove(userId, productId);
  }

  async clear(userId: string): Promise<void> {
    await this.wishlistRepository.clearAll(userId);
  }
}
