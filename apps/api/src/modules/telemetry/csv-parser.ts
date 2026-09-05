import { csvReadingRowSchema, CsvReadingRow } from '@aria/contracts';

export function parseCsvReadings(raw: string): CsvReadingRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('فایل CSV باید سرستون و حداقل یک ردیف داده داشته باشد.');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['tag_name', 'time', 'value'];
  for (const col of required) {
    if (!header.includes(col)) {
      throw new Error(`ستون اجباری ${col} در CSV نیست.`);
    }
  }

  const rows: CsvReadingRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim());
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cols[index] ?? '';
    });
    const parsed = csvReadingRowSchema.safeParse(record);
    if (!parsed.success) {
      throw new Error(`ردیف نامعتبر: ${line}`);
    }
    rows.push(parsed.data);
  }
  return rows;
}
