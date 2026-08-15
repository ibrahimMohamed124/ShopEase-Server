import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CatalogRepository } from './catalog.repository';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CatalogRepository],
  exports: [CategoriesService],
})
export class CatalogModule {}
