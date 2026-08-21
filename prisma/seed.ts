import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// نفس النمط اللي في PrismaService بتاعك — Prisma 7 محتاج driver adapter صريح
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface CategorySeed {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  imageUrl: string;
  // 'All' موجودة في كل category في الفلاتر كـfilter chip بس (مش subcategory
  // حقيقية) — بنتجاهلها في اللوب تحت
  subcategories: string[];
}

interface ProductSeed {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  categoryId: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  badge?: string;
  inStock: boolean;
}

const categories: CategorySeed[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'cpu',
    colorHex: '#6C63FF',
    imageUrl:
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
    subcategories: [
      'All',
      'Phones',
      'Laptops',
      'Tablets',
      'Headphones',
      'Cameras',
    ],
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: 'shopping-bag',
    colorHex: '#FF6B6B',
    imageUrl:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80',
    subcategories: ['All', "Men's", "Women's", 'Kids', 'Shoes', 'T-Shirts'],
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: 'watch',
    colorHex: '#FFB800',
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    subcategories: ['All', 'Watches', 'Bags', 'Jewelry', 'Sunglasses', 'Belts'],
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: 'activity',
    colorHex: '#22C55E',
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    subcategories: ['All', 'Running', 'Gym', 'Yoga', 'Cycling', 'Outdoor'],
  },
  {
    id: 'home',
    name: 'Home & Living',
    icon: 'home',
    colorHex: '#06B6D4',
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    subcategories: [
      'All',
      'Furniture',
      'Kitchen',
      'Decor',
      'Lighting',
      'Bedding',
    ],
  },
];

const products: ProductSeed[] = [
  {
    id: '1',
    name: 'AirPods Pro Max',
    price: 249.99,
    originalPrice: 299.99,
    description:
      'Premium wireless headphones with industry-leading noise cancellation and immersive spatial audio.',
    categoryId: 'electronics',
    rating: 4.8,
    reviewCount: 2341,
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '2',
    name: 'Nike Air Max 270',
    price: 129.99,
    originalPrice: 159.99,
    description:
      'Bold silhouette with a large air unit that provides day-long comfort and cushioning.',
    categoryId: 'fashion',
    rating: 4.6,
    reviewCount: 1876,
    imageUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    badge: 'Hot',
    inStock: true,
  },
  {
    id: '3',
    name: 'MacBook Pro 14"',
    price: 1999.0,
    originalPrice: 2199.0,
    description:
      'Apple M3 Pro performance, stunning display, and exceptional battery life for pro workflows.',
    categoryId: 'electronics',
    rating: 4.9,
    reviewCount: 5120,
    imageUrl:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
    badge: 'New',
    inStock: true,
  },
  {
    id: '4',
    name: 'Rolex Submariner',
    price: 899.99,
    description:
      'Timeless watch design with durable construction and premium craftsmanship.',
    categoryId: 'accessories',
    rating: 4.7,
    reviewCount: 432,
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    inStock: true,
  },
  {
    id: '5',
    name: 'Sony WH-1000XM5',
    price: 279.99,
    originalPrice: 349.99,
    description:
      'Top-tier noise canceling headphones with clear calls and long battery life.',
    categoryId: 'electronics',
    rating: 4.7,
    reviewCount: 3201,
    imageUrl:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '6',
    name: "Levi's 501 Original Jeans",
    price: 69.99,
    description: 'The iconic straight fit denim with a classic button fly.',
    categoryId: 'fashion',
    rating: 4.5,
    reviewCount: 8902,
    imageUrl:
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
    inStock: true,
  },
  {
    id: '7',
    name: 'iPad Air 5th Gen',
    price: 599.99,
    originalPrice: 699.99,
    description:
      'Thin and light tablet with strong performance and excellent portability.',
    categoryId: 'electronics',
    rating: 4.8,
    reviewCount: 1560,
    imageUrl:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '8',
    name: 'Leather Tote Bag',
    price: 149.99,
    description:
      'Handcrafted full-grain leather tote with polished details and roomy interior.',
    categoryId: 'accessories',
    rating: 4.6,
    reviewCount: 720,
    imageUrl:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    inStock: true,
  },
  {
    id: '9',
    name: 'Running Pro Elite',
    price: 179.99,
    originalPrice: 219.99,
    description:
      'Lightweight race-ready running shoes with energetic midsole response.',
    categoryId: 'sports',
    rating: 4.7,
    reviewCount: 945,
    imageUrl:
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
    badge: 'New',
    inStock: true,
  },
  {
    id: '10',
    name: 'Smart Fitness Tracker',
    price: 89.99,
    description:
      'Track sleep, heart rate, steps, and workouts in a compact waterproof band.',
    categoryId: 'sports',
    rating: 4.4,
    reviewCount: 2870,
    imageUrl:
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80',
    inStock: false,
  },
  {
    id: '11',
    name: 'Minimalist Desk Lamp',
    price: 49.99,
    description:
      'Adjustable LED desk lamp with brightness presets and modern styling.',
    categoryId: 'home',
    rating: 4.3,
    reviewCount: 1234,
    imageUrl:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',
    inStock: true,
  },
  {
    id: '12',
    name: 'Yoga Mat Pro',
    price: 79.99,
    originalPrice: 99.99,
    description:
      'Eco-friendly yoga mat with anti-slip surface and comfort support.',
    categoryId: 'sports',
    rating: 4.6,
    reviewCount: 3411,
    imageUrl:
      'https://images.unsplash.com/photo-1601925228133-2e0f0450b272?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '13',
    name: 'Samsung Galaxy S24 Ultra',
    price: 1199.99,
    originalPrice: 1299.99,
    description:
      'Flagship Android phone with a brilliant AMOLED display and pro-grade camera system.',
    categoryId: 'electronics',
    rating: 4.7,
    reviewCount: 2984,
    imageUrl:
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
    badge: 'New',
    inStock: true,
  },
  {
    id: '14',
    name: 'Canon EOS R50',
    price: 679.99,
    originalPrice: 799.99,
    description:
      'Compact mirrorless camera with fast autofocus, ideal for photos and vlogging.',
    categoryId: 'electronics',
    rating: 4.6,
    reviewCount: 587,
    imageUrl:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '15',
    name: 'Oversized Cotton Hoodie',
    price: 44.99,
    description:
      'Relaxed-fit hoodie in heavyweight cotton fleece with a brushed interior.',
    categoryId: 'fashion',
    rating: 4.4,
    reviewCount: 1102,
    imageUrl:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80',
    inStock: true,
  },
  {
    id: '16',
    name: "Kids' Graphic Tee Set",
    price: 24.99,
    originalPrice: 32.99,
    description:
      'Pack of three soft cotton graphic tees for everyday play and comfort.',
    categoryId: 'fashion',
    rating: 4.5,
    reviewCount: 645,
    imageUrl:
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '17',
    name: 'Aviator Sunglasses',
    price: 59.99,
    description:
      'Classic aviator frames with polarized lenses and UV400 protection.',
    categoryId: 'accessories',
    rating: 4.5,
    reviewCount: 1893,
    imageUrl:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
    inStock: true,
  },
  {
    id: '18',
    name: 'Sterling Silver Necklace',
    price: 39.99,
    originalPrice: 54.99,
    description:
      'Delicate sterling silver pendant necklace, hypoallergenic and tarnish-resistant.',
    categoryId: 'accessories',
    rating: 4.6,
    reviewCount: 401,
    imageUrl:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '19',
    name: 'Adjustable Dumbbell Set',
    price: 249.99,
    description:
      'Space-saving adjustable dumbbells from 5 to 52.5 lbs per hand, quick-select dial.',
    categoryId: 'sports',
    rating: 4.8,
    reviewCount: 1567,
    imageUrl:
      'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=600&q=80',
    badge: 'Hot',
    inStock: true,
  },
  {
    id: '20',
    name: 'Trail Mountain Bike',
    price: 899.99,
    originalPrice: 1099.99,
    description:
      'Full-suspension mountain bike built for rugged trails and confident descents.',
    categoryId: 'sports',
    rating: 4.7,
    reviewCount: 312,
    imageUrl:
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=600&q=80',
    badge: 'Sale',
    inStock: false,
  },
  {
    id: '21',
    name: 'Scandinavian Accent Chair',
    price: 329.99,
    description:
      'Mid-century inspired accent chair with solid wood legs and premium upholstery.',
    categoryId: 'home',
    rating: 4.6,
    reviewCount: 288,
    imageUrl:
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80',
    inStock: true,
  },
  {
    id: '22',
    name: '12-Piece Ceramic Cookware Set',
    price: 189.99,
    originalPrice: 229.99,
    description:
      'Non-stick ceramic cookware set with even heat distribution and easy cleanup.',
    categoryId: 'home',
    rating: 4.5,
    reviewCount: 976,
    imageUrl:
      'https://images.unsplash.com/photo-1584990347449-a2d4c1b8b1c8?w=600&q=80',
    badge: 'Sale',
    inStock: true,
  },
  {
    id: '23',
    name: 'Linen Throw Pillow Set',
    price: 34.99,
    description:
      'Set of two breathable linen throw pillow covers with hidden zipper closure.',
    categoryId: 'home',
    rating: 4.3,
    reviewCount: 512,
    imageUrl:
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=80',
    inStock: true,
  },
  {
    id: '24',
    name: 'Wireless Charging Stand',
    price: 34.99,
    originalPrice: 44.99,
    description:
      'Fast wireless charging stand compatible with phones, earbuds, and smartwatches.',
    categoryId: 'electronics',
    rating: 4.4,
    reviewCount: 1749,
    imageUrl:
      'https://images.unsplash.com/photo-1591290619762-c4b7b6b78d7e?w=600&q=80',
    inStock: true,
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        icon: category.icon,
        colorHex: category.colorHex,
        imageUrl: category.imageUrl,
      },
      create: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        colorHex: category.colorHex,
        imageUrl: category.imageUrl,
      },
    });

    for (const name of category.subcategories) {
      if (name === 'All') continue;

      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { name, categoryId: category.id },
      });
    }
  }

  for (const product of products) {
    const data = {
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      images: [product.imageUrl],
      badge: product.badge ?? null,
      inStock: product.inStock,
      // مش موجودة في بيانات الفلاتر — بافترض رقم افتراضي معقول حسب حالة التوفر
      stockQuantity: product.inStock ? 50 : 0,
      rating: product.rating,
      reviewCount: product.reviewCount,
      categoryId: product.categoryId,
    };

    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: { id: product.id, ...data },
    });
  }

  console.log(
    `Seeded ${categories.length} categories and ${products.length} products.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
