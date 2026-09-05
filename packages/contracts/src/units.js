"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitAliases = void 0;
exports.normalizeUnit = normalizeUnit;
/** واحدهای صنعتی — جلوگیری از ناهماهنگی SI/Imperial در قراردادهای مشترک */
exports.unitAliases = {
    bar: 'bar',
    psi: 'psi',
    c: 'degC',
    '°c': 'degC',
    degc: 'degC',
    k: 'K',
    m3h: 'm3/h',
    mm_s: 'mm/s',
};
function normalizeUnit(raw) {
    const key = raw.trim().toLowerCase();
    return exports.unitAliases[key] ?? raw;
}
//# sourceMappingURL=units.js.map