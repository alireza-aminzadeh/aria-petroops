import { z } from 'zod';

export const mqttReadingSchema = z.object({
  tag: z.string().min(1).max(128),
  ts: z.string().min(1),
  value: z.coerce.number(),
  quality: z.coerce.number().int().optional().default(0),
});

export type MqttReading = z.infer<typeof mqttReadingSchema>;

export const energyKinds = ['electricity', 'fuel_gas', 'steam', 'flare'] as const;
export type EnergyKind = (typeof energyKinds)[number];

export const anomalyStatuses = ['open', 'acknowledged', 'closed', 'not_configured'] as const;
export type AnomalyStatus = (typeof anomalyStatuses)[number];
