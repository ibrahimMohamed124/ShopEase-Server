import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

// PrismaService مش لازم يتحقن هنا لأنه @Global() زي ما هو في PrismaModule بتاعك
@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
