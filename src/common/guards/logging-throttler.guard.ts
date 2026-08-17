import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerException,
} from '@nestjs/throttler';
import { Request } from 'express';

// نفس الـThrottlerGuard الافتراضي، بس بيسجل كل مرة request بيتحظر فيها
// بسبب rate limit. من غير اللوج ده، محاولات الـbrute-force على /auth/login
// أو أي endpoint حساس كانت بترجع 429 للعميل من غير ما حد يعرف إن فيه
// نمط هجوم بيحصل أصلًا — الـlogs العادية مش بتفرّق بينها وبين أي 4xx تاني.
@Injectable()
export class LoggingThrottlerGuard extends ThrottlerGuard {
  private readonly rateLimitLogger = new Logger('RateLimit');

  // بيتلف عشان نلقط الـIP الحقيقي لو السيرفر شغال ورا proxy/load balancer
  // (Render, Railway, nginx, إلخ) — لازم "trust proxy" يكون متفعّل في
  // Express عشان req.ips يترمّلي صح، وإلا هيرجع دايمًا IP بتاع الـproxy
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;
    return request.ips.length > 0 ? request.ips[0] : (request.ip ?? 'unknown');
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const { limit, ttl, tracker, totalHits } = throttlerLimitDetail;

    this.rateLimitLogger.warn(
      `Rate limit exceeded: ${request.method} ${request.originalUrl} ` +
        `by ${tracker} — ${totalHits} hits (limit ${limit}/${ttl}ms)`,
    );

    throw new ThrottlerException(
      await this.getErrorMessage(context, throttlerLimitDetail),
    );
  }
}