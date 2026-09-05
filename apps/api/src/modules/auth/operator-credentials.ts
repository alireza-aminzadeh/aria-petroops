export const OPERATOR_USERNAME = 'alireza';
export const OPERATOR_LOCAL_PASSWORD = 'alireza';
export const OPERATOR_PRODUCTION_PASSWORD = 'Aria7x!Alireza#Ops2026';

export function resolveOperatorPassword(): string {
  const explicit = process.env.SEED_ALIREZA_PASSWORD?.trim();
  if (explicit) {
    return explicit;
  }

  return process.env.ARIA_RUNTIME === 'production'
    ? OPERATOR_PRODUCTION_PASSWORD
    : OPERATOR_LOCAL_PASSWORD;
}
