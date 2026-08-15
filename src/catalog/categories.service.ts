import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CatalogRepository, CategoryWithRelations } from './catalog.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  productCount: number;
  imageUrl: string;
  // Category.fromJson في الفلاتر بيقرا subcategories كـ List<String> —
  // فبنبعت أسماء الـsubcategories بس هنا، مش الكائن الكامل (ده جاي من
  // GET /categories/:id/subcategories المنفصل)
  subcategories: string[];
}

interface SubcategoryRecord {
  id: string;
  name: string;
  categoryId: string;
  imageUrl: string | null;
}

export interface SubcategoryResponse {
  id: string;
  name: string;
  categoryId: string;
  imageUrl: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async findAllCategories(): Promise<CategoryResponse[]> {
    const categories = await this.catalogRepository.findAllCategories();
    return categories.map((category) => this.toCategoryResponse(category));
  }

  async findCategory(id: string): Promise<CategoryResponse> {
    const category = await this.catalogRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.toCategoryResponse(category);
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponse> {
    try {
      const category = await this.catalogRepository.createCategory({
        name: dto.name,
        icon: dto.icon ?? null,
        ...(dto.colorHex ? { colorHex: dto.colorHex } : {}),
        imageUrl: dto.imageUrl ?? null,
      });
      return this.toCategoryResponse(category);
    } catch (error) {
      throw this.mapUniqueNameError(error, 'Category');
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    await this.ensureCategoryExists(id);

    try {
      const category = await this.catalogRepository.updateCategory(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.colorHex !== undefined ? { colorHex: dto.colorHex } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      });
      return this.toCategoryResponse(category);
    } catch (error) {
      throw this.mapUniqueNameError(error, 'Category');
    }
  }

  async removeCategory(id: string): Promise<void> {
    await this.ensureCategoryExists(id);

    try {
      await this.catalogRepository.removeCategory(id);
    } catch (error) {
      throw this.mapDeleteInUseError(error, 'products or subcategories');
    }
  }

  async findSubcategories(categoryId: string): Promise<SubcategoryResponse[]> {
    await this.ensureCategoryExists(categoryId);
    const subcategories =
      await this.catalogRepository.findSubcategories(categoryId);
    return subcategories.map((subcategory) =>
      this.toSubcategoryResponse(subcategory),
    );
  }

  async createSubcategory(
    categoryId: string,
    dto: CreateSubcategoryDto,
  ): Promise<SubcategoryResponse> {
    await this.ensureCategoryExists(categoryId);

    try {
      const subcategory = await this.catalogRepository.createSubcategory({
        name: dto.name,
        imageUrl: dto.imageUrl ?? null,
        category: { connect: { id: categoryId } },
      });
      return this.toSubcategoryResponse(subcategory);
    } catch (error) {
      throw this.mapUniqueNameError(error, 'Subcategory');
    }
  }

  async updateSubcategory(
    categoryId: string,
    subcategoryId: string,
    dto: UpdateSubcategoryDto,
  ): Promise<SubcategoryResponse> {
    // بنتأكد إن الـsubcategory ده فعلاً تابع للـcategory اللي في الـURL —
    // وإلا حد يقدر يعدل subcategory من category تانية عن طريق الغلط
    await this.ensureSubcategoryBelongsToCategory(categoryId, subcategoryId);

    try {
      const subcategory = await this.catalogRepository.updateSubcategory(
        subcategoryId,
        {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        },
      );
      return this.toSubcategoryResponse(subcategory);
    } catch (error) {
      throw this.mapUniqueNameError(error, 'Subcategory');
    }
  }

  async removeSubcategory(
    categoryId: string,
    subcategoryId: string,
  ): Promise<void> {
    await this.ensureSubcategoryBelongsToCategory(categoryId, subcategoryId);

    try {
      await this.catalogRepository.removeSubcategory(subcategoryId);
    } catch (error) {
      throw this.mapDeleteInUseError(error, 'products');
    }
  }

  private async ensureCategoryExists(id: string): Promise<void> {
    const category = await this.catalogRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureSubcategoryBelongsToCategory(
    categoryId: string,
    subcategoryId: string,
  ): Promise<void> {
    const subcategory =
      await this.catalogRepository.findSubcategoryById(subcategoryId);
    if (!subcategory || subcategory.categoryId !== categoryId) {
      throw new NotFoundException('Subcategory not found');
    }
  }

  private mapUniqueNameError(error: unknown, entity: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new BadRequestException(`${entity} name must be unique`);
    }
    return error as Error;
  }

  private mapDeleteInUseError(error: unknown, whatBlocksIt: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return new BadRequestException(
        `Cannot delete — it still has linked ${whatBlocksIt}`,
      );
    }
    return error as Error;
  }

  private toCategoryResponse(
    category: CategoryWithRelations,
  ): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon ?? 'category',
      colorHex: category.colorHex,
      productCount: category._count.products,
      imageUrl: category.imageUrl ?? '',
      subcategories: category.subcategories.map(
        (subcategory) => subcategory.name,
      ),
    };
  }

  private toSubcategoryResponse(
    subcategory: SubcategoryRecord,
  ): SubcategoryResponse {
    return {
      id: subcategory.id,
      name: subcategory.name,
      categoryId: subcategory.categoryId,
      imageUrl: subcategory.imageUrl ?? '',
    };
  }
}
