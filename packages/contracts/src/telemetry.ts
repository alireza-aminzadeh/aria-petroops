import { z } from 'zod';

export const csvReadingRowSchema = z.object({
  tag_name: z.string().min(1),
  time: z.string().min(1),
  value: z.coerce.number(),
  quality: z.coerce.number().int().optional().default(0),
});

export type CsvReadingRow = z.infer<typeof csvReadingRowSchema>;
