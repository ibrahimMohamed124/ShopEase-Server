import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_INCLUDE = {
  subcategories: true,
  // productCount في موديل الفلاتر بيتحسب لايف من عدد المنتجات الفعلي
  // بدل ما نخزنه كرقم منفصل ممكن يخرج عن المزامنة
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

export type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: typeof CATEGORY_INCLUDE;
}>;

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllCategories(): Promise<CategoryWithRelations[]> {
    return this.prisma.category.findMany({
      include: CATEGORY_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  findCategoryById(id: string): Promise<CategoryWithRelations | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
  }

  createCategory(
    data: Prisma.CategoryCreateInput,
  ): Promise<CategoryWithRelations> {
    return this.prisma.category.create({ data, include: CATEGORY_INCLUDE });
  }

  updateCategory(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<CategoryWithRelations> {
    return this.prisma.category.update({
      where: { id },
      data,
      include: CATEGORY_INCLUDE,
    });
  }

  removeCategory(id: string): Promise<CategoryWithRelations> {
    return this.prisma.category.delete({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
  }

  findSubcategories(categoryId: string) {
    return this.prisma.subcategory.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  findSubcategoryById(id: string) {
    return this.prisma.subcategory.findUnique({ where: { id } });
  }

  createSubcategory(data: Prisma.SubcategoryCreateInput) {
    return this.prisma.subcategory.create({ data });
  }

  updateSubcategory(id: string, data: Prisma.SubcategoryUpdateInput) {
    return this.prisma.subcategory.update({ where: { id }, data });
  }

  removeSubcategory(id: string) {
    return this.prisma.subcategory.delete({ where: { id } });
  }
}
