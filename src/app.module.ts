import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingThrottlerGuard } from './common/guards/logging-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CatalogModule } from './catalog/catalog.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CartModule } from './cart/cart.module';
import { MailModule } from './mail/mail.module';
import { AddressesModule } from './addresses/addresses.module';
import { OrdersModule } from './orders/orders.module';
import { CheckoutModule } from './checkout/checkout.module';
import { envValidationSchema } from './config/env.validation';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      validationSchema: envValidationSchema,
      // بيوقف الـstartup كله لو فيه متغير required ناقص أو شكله غلط،
      // بدل ما يشتغل السيرفر ويقع بعدين وسط request حقيقي
      validationOptions: { abortEarly: false },
    }),
    // ليمِت افتراضي عام على كل الـAPI: 60 request لكل IP في الدقيقة.
    // الـendpoints الحساسة (login/register/forgot-password) عندها
    // ليمِت أضيق بالـ@Throttle() على مستوى الـcontroller نفسه.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    MailModule,
    ProductsModule,
    CatalogModule,
    ReviewsModule,
    WishlistModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    CheckoutModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: LoggingThrottlerGuard },
  ],
})
export class AppModule {}
