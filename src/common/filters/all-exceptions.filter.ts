import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface NormalizedErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

// بيمسك أي exception يطلع من أي controller/service مش اتمسك قبل كده،
// ويرجّعها بشكل واحد ثابت للفرونت-إند. بدون الفلتر ده، أي error مش
// متوقعة (زي Prisma constraint violation أو null pointer) كانت هتطلع
// كـstack trace خام أو رسالة NestJS الافتراضية اللي مش موحّدة الشكل.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.normalize(exception);

    // 401/403/429 دي أهم حاجة تتراقب أمنيًا (محاولات دخول فاشلة، وصول
    // ممنوع، rate-limit) — بنضيف الـIP في اللوج بتاعهم عشان تقدر تتبّع
    // نمط هجوم لو حصل (بروت-فورس على حساب معيّن، سكان على endpoints
    // محظورة، إلخ). باقي الـ4xx العادية (400 validation, 404) مش محتاجة
    // نفس المستوى ده من التتبع.
    const securitySensitiveStatuses = [
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.TOO_MANY_REQUESTS,
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (securitySensitiveStatuses.includes(statusCode)) {
      const ip =
        request.ips.length > 0 ? request.ips[0] : (request.ip ?? 'unknown');
      this.logger.warn(
        `${request.method} ${request.url} -> ${statusCode} (${ip})`,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}`);
    }

    const body: NormalizedErrorBody = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // ValidationPipe وأي HttpException تانية بترجّع الـresponse كـ
      // object فيه message/error جاهزين (زي {statusCode, message, error})،
      // فبنسحبهم منه لو موجودين بدل ما نلف الأوبجكت كله جوه message
      if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;
        return {
          statusCode: status,
          error:
            typeof obj.error === 'string'
              ? obj.error
              : exception.constructor.name.replace('Exception', ''),
          message: (obj.message as string | string[]) ?? exception.message,
        };
      }

      return {
        statusCode: status,
        error: exception.constructor.name.replace('Exception', ''),
        message: exception.message,
      };
    }

    // أي حاجة مش HttpException (خطأ من Prisma، bug في الكود، إلخ) —
    // بنرجّع 500 عام من غير ما نسرّب تفاصيل داخلية (اسم الجدول، الكويري،
    // الـstack) للعميل. التفاصيل دي بتتسجل في الـlogs بس فوق
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again later.',
    };
  }
}
