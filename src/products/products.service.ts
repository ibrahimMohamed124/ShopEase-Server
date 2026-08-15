import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ProductsRepository, ProductWithCategory } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsQueryDto } from './dto/query-product.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: { id: string; name: string } | null;
  images: string[];
  // Flutter's Product.fromJson بيقرا imageUrl/image_url/thumbnail أو أول
  // عنصر في images — فبنبعتها صريحة عشان مايعتمدش على fallback
  imageUrl: string;
  badge: string | null;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(query: FindProductsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE),
    );

    const { items, total } = await this.productsRepository.findMany({
      categoryId: query.category,
      search: query.search,
      skip: (page - 1) * limit,
      take: limit,
    });

    // مغلف تحت 'products' عشان ProductService._readList في الفلاتر بيدور
    // على أول key موجود من ['products', 'data', 'items']
    return {
      products: items.map((item) => this.toResponse(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findFeatured(): Promise<ProductResponse[]> {
    const items = await this.productsRepository.findFeatured();
    return items.map((item) => this.toResponse(item));
  }

  async findOne(id: string): Promise<ProductResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const product = await this.productsRepository.findById(id);
    if (!product) {
      // الفلاتر بتلقط الـ404 دي في fetchProductById وترجع null بدل ما ترمي
      throw new NotFoundException('Product not found');
    }
    return this.toResponse(product);
  }

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    this.assertOriginalPriceIsValid(dto.price, dto.originalPrice);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const product = await this.productsRepository.create({
        name: dto.name,
        description: dto.description,
        price: dto.price,
        originalPrice: dto.originalPrice ?? null,
        images: dto.images,
        badge: dto.badge ?? null,
        inStock: dto.inStock ?? true,
        stockQuantity: dto.stockQuantity ?? 0,
        category: { connect: { id: dto.categoryId } },
        ...(dto.subcategoryId
          ? { subcategory: { connect: { id: dto.subcategoryId } } }
          : {}),
      });

      return this.toResponse(product);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.productsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.price !== undefined || dto.originalPrice !== undefined) {
      const nextPrice = dto.price ?? Number(existing.price);
      const nextOriginalPrice =
        dto.originalPrice ??
        (existing.originalPrice === null ? undefined : Number(existing.originalPrice));
      this.assertOriginalPriceIsValid(nextPrice, nextOriginalPrice);
    }

    try {
      const product = await this.productsRepository.update(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.originalPrice !== undefined ? { originalPrice: dto.originalPrice } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.badge !== undefined ? { badge: dto.badge } : {}),
        ...(dto.inStock !== undefined ? { inStock: dto.inStock } : {}),
        ...(dto.stockQuantity !== undefined ? { stockQuantity: dto.stockQuantity } : {}),
        ...(dto.categoryId !== undefined
          ? { category: { connect: { id: dto.categoryId } } }
          : {}),
        ...(dto.subcategoryId !== undefined
          ? { subcategory: { connect: { id: dto.subcategoryId } } }
          : {}),
      });

      return this.toResponse(product);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.productsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    await this.productsRepository.remove(id);
  }

  private assertOriginalPriceIsValid(price: number, originalPrice?: number) {
    if (originalPrice !== undefined && originalPrice <= price) {
      throw new BadRequestException(
        'originalPrice must be greater than price',
      );
    }
  }

  // P2025/P2003 بتطلع لما categoryId أو subcategoryId مبعوتين لكن مش موجودين
  // فعليًا في الداتابيز — منترجمها لـ400 بدل ما تبان كـ500 غير مفهوم
  private mapWriteError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025' || error.code === 'P2003') {
        return new BadRequestException('Invalid categoryId or subcategoryId');
      }
    }
    return error as Error;
  }

  private toResponse(product: ProductWithCategory): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      originalPrice:
        product.originalPrice === null ? null : Number(product.originalPrice),
      category: product.category
        ? { id: product.category.id, name: product.category.name }
        : null,
      images: product.images,
      imageUrl: product.images[0] ?? '',
      badge: product.badge,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      rating: Number(product.rating ?? 0),
      reviewCount: product.reviewCount ?? 0,
    };
  }
}
