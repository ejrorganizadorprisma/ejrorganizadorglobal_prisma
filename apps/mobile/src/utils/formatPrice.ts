export function formatPrice(centavos: number): string {
  if (!centavos && centavos !== 0) return 'Gs. 0';
  const value = Math.round(centavos);
  return `Gs. ${value.toLocaleString('es-PY')}`;
}

export function formatPriceShort(centavos: number): string {
  if (!centavos) return '0';
  if (centavos >= 1000000) return `${(centavos / 1000000).toFixed(1)}M`;
  if (centavos >= 1000) return `${(centavos / 1000).toFixed(0)}K`;
  return centavos.toString();
}
