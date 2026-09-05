import { z } from 'zod';

export const workOrderPriorities = ['low', 'medium', 'high', 'critical'] as const;

export const workOrderStatuses = [
  'draft',
  'assigned',
  'inProgress',
  'pendingApproval',
  'approved',
  'closed',
  'cancelled',
] as const;

export const createWorkOrderSchema = z.object({
  equipmentId: z.string().uuid(),
  description: z.string().min(3),
  priority: z.enum(workOrderPriorities).default('medium'),
});

export const workOrderEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ASSIGN'), technicianId: z.string().uuid() }),
  z.object({ type: z.literal('START') }),
  z.object({ type: z.literal('SUBMIT_FOR_APPROVAL') }),
  z.object({ type: z.literal('APPROVE') }),
  z.object({ type: z.literal('REJECT'), reason: z.string().min(3) }),
  z.object({ type: z.literal('CLOSE') }),
  z.object({ type: z.literal('CANCEL') }),
]);

export const createMaintenancePlanSchema = z.object({
  equipmentId: z.string().uuid(),
  planType: z.enum(['PM', 'CBM']),
  frequencyDays: z.number().int().positive().nullable().optional(),
  nextDueAt: z.string().date().optional(),
});

export type CreateWorkOrderDto = z.infer<typeof createWorkOrderSchema>;
export type WorkOrderEventDto = z.infer<typeof workOrderEventSchema>;
export type CreateMaintenancePlanDto = z.infer<typeof createMaintenancePlanSchema>;
