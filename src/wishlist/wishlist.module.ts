import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistRepository } from './wishlist.repository';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [WishlistController],
  providers: [WishlistService, WishlistRepository],
})
export class WishlistModule {}
