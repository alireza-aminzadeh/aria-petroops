"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaintenancePlanSchema = exports.workOrderEventSchema = exports.createWorkOrderSchema = exports.workOrderStatuses = exports.workOrderPriorities = void 0;
const zod_1 = require("zod");
exports.workOrderPriorities = ['low', 'medium', 'high', 'critical'];
exports.workOrderStatuses = [
    'draft',
    'assigned',
    'inProgress',
    'pendingApproval',
    'approved',
    'closed',
    'cancelled',
];
exports.createWorkOrderSchema = zod_1.z.object({
    equipmentId: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(3),
    priority: zod_1.z.enum(exports.workOrderPriorities).default('medium'),
});
exports.workOrderEventSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({ type: zod_1.z.literal('ASSIGN'), technicianId: zod_1.z.string().uuid() }),
    zod_1.z.object({ type: zod_1.z.literal('START') }),
    zod_1.z.object({ type: zod_1.z.literal('SUBMIT_FOR_APPROVAL') }),
    zod_1.z.object({ type: zod_1.z.literal('APPROVE') }),
    zod_1.z.object({ type: zod_1.z.literal('REJECT'), reason: zod_1.z.string().min(3) }),
    zod_1.z.object({ type: zod_1.z.literal('CLOSE') }),
    zod_1.z.object({ type: zod_1.z.literal('CANCEL') }),
]);
exports.createMaintenancePlanSchema = zod_1.z.object({
    equipmentId: zod_1.z.string().uuid(),
    planType: zod_1.z.enum(['PM', 'CBM']),
    frequencyDays: zod_1.z.number().int().positive().nullable().optional(),
    nextDueAt: zod_1.z.string().date().optional(),
});
//# sourceMappingURL=work-order.js.map