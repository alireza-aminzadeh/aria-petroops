import { z } from 'zod';

export const equipmentClasses = ['pump', 'compressor', 'turbine', 'other'] as const;
export const criticalityLevels = ['low', 'medium', 'high', 'critical'] as const;

export const createEquipmentSchema = z.object({
  unitId: z.string().uuid(),
  tagNumber: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  equipmentClass: z.enum(equipmentClasses),
  criticality: z.enum(criticalityLevels),
});

export const createTagSchema = z.object({
  equipmentId: z.string().uuid(),
  tagName: z.string().min(1).max(128),
  unitOfMeasure: z.string().min(1).max(32),
  dataType: z.enum(['numeric', 'boolean', 'string']).default('numeric'),
});

export type CreateEquipmentDto = z.infer<typeof createEquipmentSchema>;
export type CreateTagDto = z.infer<typeof createTagSchema>;
