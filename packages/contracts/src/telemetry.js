"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvReadingRowSchema = void 0;
const zod_1 = require("zod");
exports.csvReadingRowSchema = zod_1.z.object({
    tag_name: zod_1.z.string().min(1),
    time: zod_1.z.string().min(1),
    value: zod_1.z.coerce.number(),
    quality: zod_1.z.coerce.number().int().optional().default(0),
});
//# sourceMappingURL=telemetry.js.map