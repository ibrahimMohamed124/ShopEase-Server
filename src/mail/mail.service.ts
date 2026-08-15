import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildPasswordResetEmail } from '../../public/password-reset.template';


@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: Number(this.configService.getOrThrow<string>('SMTP_PORT')),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASS'),
      },
    });

    const fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'ShopEase',
    );
    const fromEmail = this.configService.getOrThrow<string>('SMTP_FROM_EMAIL');
    this.fromAddress = `"${fromName}" <${fromEmail}>`;
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const { subject, html, text } = buildPasswordResetEmail({
      name,
      resetUrl,
      expiresInMinutes,
    });

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      // بنسجل الخطأ بس مش بنرميه — forgotPassword لازم يفضل صامت من
      // برا (مايكشفش هل الإيميل مسجل ولا لأ)، حتى لو الإرسال فشل فعليًا
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
