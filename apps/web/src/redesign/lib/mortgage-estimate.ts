import { MIN_REASONABLE_PRICE_RUB, normalizePriceValue } from '@/redesign/lib/display-price';

export type MortgageEstimateInput = {
  priceRub: number;
  downPaymentPct?: number;
  years?: number;
  annualRatePct?: number;
};

/** Indicative monthly payment — not a bank offer. Returns null when price hidden. */
export function estimateMortgageMonthlyPayment(input: MortgageEstimateInput): number | null {
  const price = normalizePriceValue(input.priceRub);
  if (price === null) return null;

  const downPct = input.downPaymentPct ?? 20;
  const years = input.years ?? 20;
  const ratePct = input.annualRatePct ?? 5.9;

  const loanAmount = price * (1 - downPct / 100);
  if (loanAmount <= 0) return null;

  const monthlyRate = ratePct / 100 / 12;
  const months = years * 12;

  if (monthlyRate <= 0) return loanAmount / months;

  return (
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

export function formatRubMonthly(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} ₽/мес`;
}

export const MORTGAGE_ESTIMATE_DISCLAIMER =
  'Ориентировочный расчёт при взносе 20%, сроке 20 лет, ставке 5,9%. Не является офертой.';
