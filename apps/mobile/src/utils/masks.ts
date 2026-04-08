// Input masks — pure functions, no external dependencies.
// Reuses the same 'es-PY' locale convention as utils/formatPrice.ts.

export const onlyDigits = (s: string): string => s.replace(/\D/g, '');

// Paraguayan phone numbers. Accepts local (09XX) and international (+595).
// Keeps up to 12 digits. Visual format examples:
//   "595981"       → "5959 81"
//   "0981123456"   → "0981 123-456"
//   "595981123456" → "5959 811-23456"
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 12);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)}-${d.slice(7)}`;
}

// Document / CI / RUC: groups of 3 digits separated by dots (PY convention).
// Ex: "1234567" → "1.234.567"
export function formatDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 12);
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Guarani currency (no decimals, thousands separator).
// Ex: "10000000" → "10.000.000"
export function formatGuarani(value: string): string {
  const d = onlyDigits(value).slice(0, 12);
  if (!d) return '';
  return Number(d).toLocaleString('es-PY');
}
