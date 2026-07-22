/**
 * Sanitiza uma URL antes de usá-la em href/src/window.open.
 * Só permite http(s) ou caminho relativo — bloqueia javascript:, data:, etc.
 * Retorna undefined se a URL não for segura.
 */
export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return u;
  return undefined;
}
