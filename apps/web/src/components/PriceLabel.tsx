import { cn } from '@/lib/utils';
import {
  PRICE_ON_REQUEST,
  PRICE_ON_REQUEST_CLASS,
  isPriceFallbackText,
  priceAriaLabel,
} from '@/redesign/lib/display-price';

type Props = {
  /** Готовая строка цены (например, "от 5.4 млн ₽" или «Цена по запросу») */
  value: string | null | undefined;
  className?: string;
  /** true — выделять красным как «горячее» */
  hot?: boolean;
};

/**
 * Единый стиль ценника на карточках. Принимает уже отформатированную строку
 * из formatPriceFrom / formatDisplayPrice.
 */
const PriceLabel = ({ value, className, hot }: Props) => {
  const text = value?.trim() ? value.trim() : PRICE_ON_REQUEST;
  const fallback = isPriceFallbackText(text) || text === '—';
  return (
    <span
      className={cn(
        'font-bold text-sm shrink-0',
        hot && !fallback ? 'text-[#EF4444]' : fallback ? PRICE_ON_REQUEST_CLASS : 'text-primary',
        className,
      )}
      aria-label={priceAriaLabel(text)}
    >
      {text}
    </span>
  );
};

export default PriceLabel;
