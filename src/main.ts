import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // لو السيرفر شغال ورا load balancer/reverse proxy (Render, Railway,
  // nginx, إلخ) — بدون ده، Express هيفتكر إن كل الطلبات جاية من IP
  // الـproxy نفسه، وده بيكسر rate limiting والـlogging المبني على IP
  // العميل الحقيقي (X-Forwarded-For)
  app.set('trust proxy', 1);

  app.useStaticAssets(join(__dirname, '..', '..', 'public'));

  // Security headers (CSP, X-Frame-Options, X-Content-Type-Options, إلخ).
  // بنعطّل contentSecurityPolicy الافتراضية بتاعة helmet لأنها متصممة
  // لسيرفرات بترندر HTML؛ الـAPI ده JSON بس، والـfrontend (تطبيق منفصل)
  // هو اللي يحدد CSP بتاعته لوحده.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      // بدون ده، helmet بيمنع الـfrontend (origin مختلف) من إنه يعرض
      // صور الـavatars اللي بنسيرفها من public/uploads كـstatic files
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // فلتر واحد بيلف كل الـexceptions ويرجّعهم بشكل موحّد، وبيمنع أي
  // stack trace أو تفاصيل داخلية إنها تسرّب في الـresponse
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`Server listening on port ${port}`, 'Bootstrap');
}
void bootstrap();
