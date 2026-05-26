import { useState, type ReactNode } from 'react';

type Props = {
  items: ReactNode[];
  maxVisible?: number;
  className?: string;
};

/** Renders tag rows with overflow hidden behind «Показать ещё». */
export default function CollapsibleTagRow({ items, maxVisible = 8, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length > maxVisible;
  const visible = expanded || !overflow ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">{visible}</div>
      {overflow ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? 'Свернуть' : `Показать ещё${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
        </button>
      ) : null}
    </div>
  );
}
