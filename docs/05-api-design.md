# ۵) طراحی API — Aria PetroOps

## ۵.۱ اصول کلی
- **NestJS + Fastify adapter** (سریع‌تر از Express adapter پیش‌فرض، مناسب سرور کم‌منبع).
- مستندسازی خودکار با `@nestjs/swagger` → `https://petro.aria-ai.ir/api/docs`.
- Base URL: `https://petro.aria-ai.ir/api`
- احراز هویت: `Authorization: Bearer <JWT>` (Passport.js + `@nestjs/passport` + `@nestjs/jwt`).
- ورود: `POST /api/auth/login` با `{ "username": "alireza", "password": "..." }` (ایمیل هم به‌عنوان شناسه پذیرفته می‌شود).
  - لوکال: `alireza` / `alireza`
  - Production: رمز بذر را با `SEED_ALIREZA_PASSWORD` روی سرور بگذارید (در git نیست).
- اعتبارسنجی ورودی: `class-validator` + `class-transformer` روی DTO ها (یا Zod از طریق `packages/contracts` مشترک با فرانت).
- خطاها: فرمت یکنواخت JSON (`{ statusCode, message, error, timestamp }`) از طریق یک `AllExceptionsFilter` سراسری.

## ۵.۲ REST Endpoint ها (فاز ۱)

| متد | مسیر | توضیح |
|---|---|---|
| `POST` | `/api/auth/login` | ورود با `username` (یا ایمیل) و `password`؛ پاسخ JWT + پروفایل |
| `GET` | `/api/auth/me` | کاربر جاری |
| `GET` | `/api/auth/users` | کاربران تننت (برای واگذاری Work Order) |
| `GET` | `/api/sites` | فهرست سایت‌ها |
| `GET` | `/api/units?siteId=` | فهرست واحدها |
| `GET` | `/api/equipment?unitId=` | فهرست تجهیزات |
| `POST` | `/api/equipment` | افزودن تجهیز جدید (ISA-95) — PLANNER/ADMIN |
| `GET` | `/api/tags?equipmentId=` | فهرست تگ‌های تجهیز |
| `POST` | `/api/tags` | افزودن تگ سنسور — PLANNER/ADMIN |
| `POST` | `/api/telemetry/csv-import` | آپلود CSV برای پر کردن `sensor_readings` |
| `GET` | `/api/telemetry/readings?tagId=` | سری زمانی تگ |
| `GET` | `/api/telemetry/sample-csv` | دانلود CSV نمونه |
| `GET` | `/api/work-orders` | فهرست Work Order ها (فیلتر بر status/equipment) |
| `POST` | `/api/work-orders` | ایجاد Work Order جدید |
| `GET` | `/api/work-orders/{id}` | جزئیات + `availableEvents` |
| `GET` | `/api/work-orders/{id}/audit` | مسیر ممیزی hash-chain |
| `POST` | `/api/work-orders/{id}/events` | ارسال Event به XState machine (`{"type": "APPROVE"}`) |
| `GET` | `/api/maintenance-plans` | فهرست برنامه‌های نگهداری |
| `POST` | `/api/maintenance-plans` | ایجاد برنامهٔ PM/CBM |
| `POST` | `/api/maintenance-plans/{id}/status` | گذار `draft → submitted → approved/rejected` |

### نمونهٔ Controller برای گذار Work Order
```typescript
@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  @Post(':id/events')
  @UseGuards(JwtAuthGuard, WorkOrderVoterGuard)
  async sendEvent(
    @Param('id') id: string,
    @Body() dto: WorkOrderEventDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.transition(id, dto.toEvent(), user.id);
  }
}
```

## ۵.۳ WebSocket Gateway و MQTT
مسیر WS: `/ws/tags`. فاز ۲: ingest از MQTT `petroops/v1/{tag}` توسط `MqttIngestService`، سپس Prisma + broadcast.

Edge Agent فقط publish می‌کند. Nest فقط subscribe. OPC-UA فقط‌خواندنی در Edge است، نه در API.

## ۵.۴ Endpoint های AI / انرژی / آلارم (فاز ۲)
| متد | مسیر | وضعیت |
|---|---|---|
| `GET` | `/api/ai/status` | `enabled` + `method` (on-prem یا http) |
| `POST` | `/api/ai/anomaly-explain` | Isolation Forest + دانش محلی |
| `POST` | `/api/ai/knowledge-query` | جستجوی بستهٔ دانش محلی (نه LLM) |
| `GET` | `/api/ai/rul?equipmentId=` | RUL مهندسی ISO 10816 |
| `GET` | `/api/anomaly-events` | فهرست رویدادها |
| `POST` | `/api/anomaly-events/{id}/acknowledge` | دیده‌شدن |
| `POST` | `/api/anomaly-events/{id}/work-order` | دستور کار پیشنهادی |
| `GET` | `/api/alarms` / `/api/alarms/kpis` | ISA-18.2 |
| `GET` | `/api/energy/dashboard` | تراز انرژی و CO2e |

## ۵.۵ Rate Limiting و Throttling
`@nestjs/throttler` روی `/api/auth/login` و `/api/ai/*` — مطابق الزام امنیتی مشترک با SafeOps.

## ۵.۶ Versioning
فاز ۱: بدون نسخه‌بندی صریح. در صورت نیاز به breaking change، از URI Versioning توکار Nest استفاده می‌شود (`/api/v2/...`) نه هدر سفارشی (برعکس انتخاب SafeOps — چون NestJS این را به‌صورت پیش‌فرض ساده‌تر پشتیبانی می‌کند).
