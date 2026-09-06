import { format as formatJalali } from 'date-fns-jalali';
import { useLocale, AppLocale } from './locale';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * تاریخ/ساعت را طبق locale می‌سازد: fa -> شمسی (date-fns-jalali) با اعداد
 * فارسی، en -> میلادی (Intl بومی) با اعداد لاتین. ورودی نامعتبر/خالی -> «—».
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  locale: AppLocale,
  withTime = true,
): string {
  const date = toDate(value);
  if (!date) return '—';

  if (locale === 'fa') {
    const pattern = withTime ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd';
    return toPersianDigits(formatJalali(date, pattern));
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

/** فاصلهٔ نسبی («۳ دقیقه پیش») — برای رویدادهای تازه (آنومالی/آلارم) خواناتر از تاریخ کامل است. */
export function formatRelative(value: string | Date | null | undefined, locale: AppLocale): string {
  const date = toDate(value);
  if (!date) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (locale === 'en') {
    if (Math.abs(diffMin) < 1) return 'just now';
    if (Math.abs(diffMin) < 60) return `${Math.abs(diffMin)} min ago`;
    const diffHour = Math.round(diffMin / 60);
    if (Math.abs(diffHour) < 24) return `${Math.abs(diffHour)}h ago`;
    return formatDateTime(date, locale);
  }

  if (Math.abs(diffMin) < 1) return 'همین الان';
  if (Math.abs(diffMin) < 60) return `${toPersianDigits(String(Math.abs(diffMin)))} دقیقه پیش`;
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return `${toPersianDigits(String(Math.abs(diffHour)))} ساعت پیش`;
  return formatDateTime(date, locale);
}

export function formatNumber(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(value);
}

/** میانبر React: همان توابع بالا را با locale فعلی (از Context) صدا می‌زند. */
export function useDateFormat() {
  const { locale } = useLocale();
  return {
    locale,
    dateTime: (value: string | Date | null | undefined, withTime = true) =>
      formatDateTime(value, locale, withTime),
    relative: (value: string | Date | null | undefined) => formatRelative(value, locale),
    number: (value: number) => formatNumber(value, locale),
  };
}
