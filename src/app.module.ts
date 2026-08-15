import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CatalogModule } from './catalog/catalog.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CartModule } from './cart/cart.module';
import { MailModule } from './mail/mail.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MailModule,
    ProductsModule,
    CatalogModule,
    ReviewsModule,
    WishlistModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
