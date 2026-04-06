export function formatPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн ₽`;
  return `${(n / 1000).toFixed(0)} тыс ₽`;
}
