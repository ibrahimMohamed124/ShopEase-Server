export interface PasswordResetEmailParams {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

// جدول + inline styles مش عشوائي — عملاء الإيميل (خصوصًا Outlook) مش
// بتفهم CSS خارجي ولا flexbox/grid، فده أضمن شكل بيتعرض صح في كل مكان
export function buildPasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailParams): BuiltEmail {
  const subject = 'Reset your ShopEase password';
  const safeName = escapeHtml(name);

  const text = `Hi ${name},

We received a request to reset your ShopEase password. Open the link below to choose a new one:

${resetUrl}

This link expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.

— The ShopEase Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#F8F9FE; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FE; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#FFFFFF; border-radius:20px; overflow:hidden; border:1px solid #E8EAEF;">
            <tr>
              <td style="padding:36px 32px 0 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td width="64" height="64" style="border-radius:18px; background-color:#FF6B6B; background-image:linear-gradient(135deg,#FF6B6B,#6C63FF); text-align:center; vertical-align:middle; font-size:28px; line-height:64px;">
                      &#128274;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px; text-align:center;">
                <p style="margin:0; font-size:20px; font-weight:700; color:#1A1A2E;">Reset your password</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px; text-align:center;">
                <p style="margin:0; font-size:15px; line-height:1.6; color:#9095A0;">
                  Hi ${safeName}, we got a request to reset the password for your ShopEase account. Tap the button below to choose a new one.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="border-radius:14px; background-color:#FF6B6B;">
                      <a href="${resetUrl}" target="_blank"
                        style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:14px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px; text-align:center;">
                <p style="margin:0; font-size:13px; color:#9095A0;">This link expires in ${expiresInMinutes} minutes.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="height:1px; background-color:#E8EAEF; width:100%; font-size:0; line-height:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 6px 0; font-size:12px; color:#9095A0;">Button not working? Paste this link into your browser:</p>
                <p style="margin:0; font-size:12px; color:#6C63FF; word-break:break-all;">${resetUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:#9095A0; text-align:center;">
                  If you didn't request a password reset, you can safely ignore this email — your password won't change.
                </p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:20px 8px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#9095A0;">&copy; ${new Date().getFullYear()} ShopEase. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

// الاسم بييجي من اليوزر وقت التسجيل، فبنعمله escape قبل ما نحطه جوا HTML
// عشان نمنع أي HTML injection لو حد سجّل باسم فيه tags
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
