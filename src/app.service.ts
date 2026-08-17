import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // GET /health — بيتحقق فعليًا إن الاتصال بالداتابيز شغال (مش بس إن
  // Node process لسه up)، عشان لود بالانسر أو uptime monitor يقدر يفرّق
  // بين "السيرفر شغال بس مقطوع عن الـDB" و"كل حاجة تمام فعلاً"
  async checkHealth() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503 بدل 200 عشان أي حد بيراقب الـendpoint ده (uptime monitor,
      // load balancer, orchestrator زي Kubernetes) يعتبر السيرفر "مش
      // صحي" فعلاً لو مقدرش يوصل للداتابيز، مش يفتكر كل حاجة تمام
      throw new ServiceUnavailableException(
        'Database connection is unavailable',
      );
    }

    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: { status: 'up', latencyMs: Date.now() - startedAt },
    };
  }
}
