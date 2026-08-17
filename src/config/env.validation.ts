import * as Joi from 'joi';

// بيتشغل مرة واحدة وقت الـstartup — لو أي متغير ناقص أو شكله غلط،
// السيرفر بيوقع فورًا بـerror واضح بدل ما يشتغل ويقع بعدين وسط request
// حقيقي (زي اللي كان بيحصل مع getOrThrow جوه MailService/JwtStrategy).
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM_NAME: Joi.string().default('ShopEase'),
  SMTP_FROM_EMAIL: Joi.string().email().required(),

  APP_URL: Joi.string().uri().required(),

  // قايمة origins مفصولة بفاصلة، زي: https://app.shopease.com,https://admin.shopease.com
  // production لازم تحدد الـorigins بالظبط — مفيش "*" مقبولة هنا خالص.
  // development بس هي اللي ممكن تسيبها فاضية (بيرجع لـlocalhost تلقائيًا).
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
})
  // مفيش .unknown(true) هنا بالغلط — لازم نسمح بمتغيرات تانية موجودة في
  // بيئة الاستضافة (زي متغيرات Render/Railway الداخلية) من غير ما نرفض
  // الـconfig كله بسببها
  .unknown(true);
