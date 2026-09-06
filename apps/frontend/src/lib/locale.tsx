import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

/**
 * سوییچ «فرمت تاریخ/عدد»، نه ترجمهٔ کامل رابط کاربری: متن‌های UI همیشه فارسی
 * می‌مانند (پروژه فعلاً i18n کامل ندارد)؛ این سوییچ فقط بین تقویم شمسی
 * (date-fns-jalali + اعداد فارسی) و میلادی (Intl بومی + اعداد لاتین) برای
 * نمایش تاریخ/ساعت/عدد جابه‌جا می‌شود — چیزی که بیشتر کاربران این حوزه
 * («نمایش شمسی یا میلادی؟») واقعاً به آن نیاز دارند.
 */
export type AppLocale = 'fa' | 'en';

const STORAGE_KEY = 'aria-petroops-date-locale';

function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'fa';
  return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fa';
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'fa',
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  useEffect(() => {
    // فقط برای ابزارهایی مثل screen reader / تاریخ مرورگر؛ dir همچنان rtl
    // می‌ماند چون متن UI فارسی است (توضیح بالا).
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: AppLocale) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
