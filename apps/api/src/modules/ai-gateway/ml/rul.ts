/**
 * Remaining Useful Life analog for rotating equipment.
 * Vibration bands follow ISO 10816-3 Group 2 (small pumps on rigid foundations)
 * as engineering guidance — not a trained C-MAPSS network (RotaGuard is still planned).
 */
export type RulInput = {
  vibrationMmS?: number | null;
  bearingTempC?: number | null;
  criticality?: string;
};

export type RulEstimate = {
  remainingDays: number;
  healthIndex: number;
  vibrationZone: 'A' | 'B' | 'C' | 'D' | 'unknown';
  method: 'iso10816_degradation';
  notes: string[];
};

const ZONE_A = 2.3;
export const ZONE_B = 4.5;
export const ZONE_C = 7.1;

export function vibrationZone(rmsMmS: number): RulEstimate['vibrationZone'] {
  if (rmsMmS < ZONE_A) return 'A';
  if (rmsMmS < ZONE_B) return 'B';
  if (rmsMmS < ZONE_C) return 'C';
  return 'D';
}

export function estimateRemainingUsefulLife(input: RulInput): RulEstimate {
  const notes: string[] = [
    'تخمین on-prem بر اساس ISO 10816-3 و دمای یاتاقان است؛ مدل LSTM C-MAPSS هنوز آموزش داده نشده.',
  ];
  const vibration = input.vibrationMmS;
  const temp = input.bearingTempC;
  let health = 82;
  let zone: RulEstimate['vibrationZone'] = 'unknown';

  if (typeof vibration === 'number' && Number.isFinite(vibration)) {
    zone = vibrationZone(vibration);
    if (zone === 'A') health = 92 - vibration * 2;
    else if (zone === 'B') health = 78 - (vibration - ZONE_A) * 6;
    else if (zone === 'C') health = 52 - (vibration - ZONE_B) * 8;
    else health = Math.max(8, 28 - (vibration - ZONE_C) * 4);
    notes.push(`ناحیه ارتعاش ISO: ${zone} (${vibration.toFixed(2)} mm/s RMS).`);
  } else {
    notes.push('تگ ارتعاش در پنجرهٔ اخیر موجود نیست.');
  }

  if (typeof temp === 'number' && Number.isFinite(temp)) {
    if (temp > 85) {
      health -= Math.min(25, (temp - 85) * 1.4);
      notes.push(`دمای یاتاقان ${temp.toFixed(1)} °C بالاتر از حد توصیه است.`);
    } else if (temp > 75) {
      health -= (temp - 75) * 0.6;
    }
  }

  const criticalityPenalty =
    input.criticality === 'critical' ? 0.85 : input.criticality === 'high' ? 0.92 : 1;
  health = Math.max(1, Math.min(99, health));
  const remainingDays = Math.round((health / 100) * 180 * criticalityPenalty);
  return {
    remainingDays,
    healthIndex: Math.round(health),
    vibrationZone: zone,
    method: 'iso10816_degradation',
    notes,
  };
}
