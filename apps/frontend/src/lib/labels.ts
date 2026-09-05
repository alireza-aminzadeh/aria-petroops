export const statusLabel: Record<string, string> = {
  draft: 'پیش‌نویس',
  assigned: 'واگذارشده',
  inProgress: 'در حال اجرا',
  pendingApproval: 'در انتظار تأیید',
  approved: 'تأییدشده',
  closed: 'بسته‌شده',
  cancelled: 'لغوشده',
  submitted: 'ارسال‌شده',
  rejected: 'ردشده',
  not_configured: 'پیکربندی‌نشده',
};

export const priorityLabel: Record<string, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'بحرانی',
};

export const classLabel: Record<string, string> = {
  pump: 'پمپ',
  compressor: 'کمپرسور',
  turbine: 'توربین',
  other: 'سایر',
};
