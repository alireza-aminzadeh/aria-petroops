"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTagSchema = exports.createEquipmentSchema = exports.criticalityLevels = exports.equipmentClasses = void 0;
const zod_1 = require("zod");
exports.equipmentClasses = ['pump', 'compressor', 'turbine', 'other'];
exports.criticalityLevels = ['low', 'medium', 'high', 'critical'];
exports.createEquipmentSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    tagNumber: zod_1.z.string().min(1).max(64),
    name: zod_1.z.string().min(1).max(200),
    equipmentClass: zod_1.z.enum(exports.equipmentClasses),
    criticality: zod_1.z.enum(exports.criticalityLevels),
});
exports.createTagSchema = zod_1.z.object({
    equipmentId: zod_1.z.string().uuid(),
    tagName: zod_1.z.string().min(1).max(128),
    unitOfMeasure: zod_1.z.string().min(1).max(32),
    dataType: zod_1.z.enum(['numeric', 'boolean', 'string']).default('numeric'),
});
//# sourceMappingURL=asset.js.map