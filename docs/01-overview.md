# ۱) معرفی محصول — Aria PetroOps («پتروپایش»)

## ۱.۱ هدف
سامانهٔ یکپارچهٔ **هوشمندی دارایی، فرآیند و انرژی** برای واحدهای عملیاتی نفت، گاز و پتروشیمی. زیردامنه: `petro.aria-ai.ir`. سرور Production: `91.107.149.251` (hostname: `petro`).

گردآوری اطلاعات، تحلیل و آنالیز فرآیندها، و اجرای این پروژه در سال‌های **۲۰۲۴، ۲۰۲۵ و ۲۰۲۶** انجام شده است.

سند بالادستی (تحلیل بازار، مقایسهٔ کامل NestJS/Symfony، دو سامانهٔ خواهر) در [`../../docs/oil-gas-petrochemical-strategy.md`](../../docs/oil-gas-petrochemical-strategy.md).

## ۱.۲ چرا NestJS؟
برخلاف سامانهٔ خواهر (Aria SafeOps که Symfony انتخاب شد)، PetroOps با **NestJS 11 + TypeScript** ساخته می‌شود چون:
- نیاز جدی به **تله‌متری real-time** و استریم زندهٔ تگ‌های صنعتی (WebSocket Gateway بومی Nest).
- اتصال به پروتکل‌های صنعتی (**OPC-UA/MQTT/Modbus**) فقط در اکوسیستم Node/Python بالغ است؛ در PHP کتابخانهٔ معتبری برای OPC-UA عملاً وجود ندارد.
- اشتراک زبان (TypeScript) با فرانت‌اند React — امکان اشتراک DTO/Type بین بک و فرانت در یک مونوریپو.

## ۱.۳ کاربران هدف
| نقش | نیاز اصلی |
|---|---|
| مهندس Reliability | پایش سلامت دارایی، RUL، آنومالی تجهیز دوار |
| مهندس فرآیند | آنومالی فرآیندی، تحلیل آلارم |
| برنامه‌ریز نت (نگهداری و تعمیرات) | زمان‌بندی PM/CBM، برنامه‌ریزی TAR، مدیریت Work Order |
| مدیر انرژی | تراز انرژی، پایش فلرینگ، حساب کربن |

## ۱.۴ ماژول‌ها (طبق سند مرجع بخش ۵.۱)

| # | ماژول | شرح | فاز |
|---|---|---|---|
| ۱ | **Data Hub صنعتی** | مدل دارایی ISA-95 (سایت→واحد→تجهیز→تگ)، ایمپورت CSV از Historian | **فاز ۱ (فعلی، فقط CSV — بدون اتصال زندهٔ OPC-UA/MQTT)** |
| ۲ | **Asset Health & Predictive Maintenance** | آنومالی (LSTM-AE/Isolation Forest)، RUL، صدور Work Order | فاز ۲ (نیاز به مدل ML واقعی؛ در فاز ۱ فقط ساختار Work Order و BPMS) |
| ۳ | **آنومالی فرآیندی و تحلیل آلارم** | آنومالی چندمتغیره، KPI آلارم ISA-18.2 | فاز ۲ |
| ۴ | **انرژی و انتشارات** | تراز انرژی، پایش فلرینگ، حساب کربن | فاز ۲ |
| ۵ | **نت، اورهال (TAR) و MRO** | زمان‌بندی PM/CBM، Work Order، بهینه‌سازی قطعات یدکی | **فاز ۱ (فعلی — هستهٔ BPMS)** |
| ۶ | **بهینه‌سازی تولید و فرآیند** | Blending، DoE/Bayesian Optimization | فاز ۳ |
| ۷ | **پایش خطوط لوله (midstream)** | تشخیص نشت | فاز ۳ (اختیاری) |
| ۸ | **پایش امنیت OT** | آنومالی Modbus/Profibus | اختیاری |

## ۱.۵ محدودهٔ فاز فعلی (Phase 2 — تله‌متری زنده و هوشمندی)
- ✅ هستهٔ BPMS فاز ۱ (Work Order / ISA-95 / CSV / Auth)
- ✅ MQTT ingest از Edge Agent (فقط outbound) + Timescale + WebSocket
- ✅ OPC-UA فقط‌خواندنی در Edge وقتی endpoint ست شود
- ✅ Isolation Forest، RUL مهندسی (ISO 10816)، دانش محلی؛ LSTM-AE مرکزی اختیاری
- ✅ انرژی/فلر/کربن و KPI آلارم ISA-18.2
- ✅ اعلان آنومالی باز به SafeOps روی `equipment_tag`
- ❌ RAG/LLM سنگین و Digital Twin (فاز ۳)
- ❌ نوشتن به DCS/PLC (عمداً ممنوع)

## ۱.۶ ارتباط با Aria SafeOps
- رجیستر دارایی (equipment_tag) این سامانه پایهٔ فیلد `equipment_tag` در Permit/MOC سامانهٔ SafeOps است.
- آنومالی باز از PetroOps به `POST /api/integrations/petroops/anomalies` فرستاده می‌شود تا مجوز روی همان تگ قابل بلوکه شدن باشد.

## ۱.۷ ورود
نام کاربری مشترک هر دو سامانه: `alireza`. رمز لوکال `alireza`. رمز Production در git نیست؛ روی سرور `SEED_ALIREZA_PASSWORD` را ست کنید. جزئیات در [`README.md`](../README.md).
