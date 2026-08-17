import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // بره الـrate limit العام (60/دقيقة) عمدًا — لو فيه أكتر من instance
  // من السيرفر ورا load balancer، أو monitoring tool بيدق كل كام ثانية،
  // مش عايزين الـhealth check نفسه يتحظر ويدي false alarm إن السيرفر واقع
  @SkipThrottle()
  @Get('health')
  health() {
    return this.appService.checkHealth();
  }
}
