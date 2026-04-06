import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { EntityFieldSchema } from '../types/schema';

export type FilterState = Record<string, string | string[] | undefined>;

interface Props {
  fields: EntityFieldSchema[];
  values: FilterState;
  onChange: (next: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

/** Maps filter UI state → API query params (flat). */
export function filtersToQueryParams(state: FilterState, fields: EntityFieldSchema[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  for (const f of fields) {
    if (!f.is_filterable) continue;
    const code = f.code;
    const raw = state[code];

    if (f.ui_type === 'number' || f.ui_type === 'relation') {
      const mn = state[`${code}__min`];
      const mx = state[`${code}__max`];
      if (mn !== undefined && mn !== '') out[`${code}_min`] = String(mn);
      if (mx !== undefined && mx !== '') out[`${code}_max`] = String(mx);
      continue;
    }

    if (f.ui_type === 'boolean') {
      if (raw === '1' || raw === 'true') out[code] = '1';
      if (raw === '0' || raw === 'false') out[code] = '0';
      continue;
    }

    if (f.ui_type === 'select' && Array.isArray(raw) && raw.length) {
      out[code] = raw.map(String);
      continue;
    }

    if (typeof raw === 'string' && raw !== '') {
      out[code] = raw;
    }
  }

  return out;
}

export function EntityFilters({ fields, values, onChange, onApply, onReset }: Props) {
  const filterable = useMemo(
    () => [...fields].filter(f => f.is_filterable).sort((a, b) => a.sort_order - b.sort_order),
    [fields],
  );

  const set = (key: string, v: string | string[] | undefined) => {
    onChange({ ...values, [key]: v });
  };

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-3 pt-2 -mx-6 px-6 mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        {filterable.map(f => {
          if (f.ui_type === 'number' || f.ui_type === 'relation') {
            return (
              <div key={f.code} className="flex flex-col gap-1 min-w-[140px]">
                <Label className="text-xs text-muted-foreground">{f.name}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="от"
                    type="number"
                    className="h-9 w-[120px]"
                    value={values[`${f.code}__min`] ?? ''}
                    onChange={e => set(`${f.code}__min`, e.target.value)}
                  />
                  <Input
                    placeholder="до"
                    type="number"
                    className="h-9 w-[120px]"
                    value={values[`${f.code}__max`] ?? ''}
                    onChange={e => set(`${f.code}__max`, e.target.value)}
                  />
                </div>
              </div>
            );
          }

          if (f.ui_type === 'boolean') {
            const v = values[f.code];
            return (
              <div key={f.code} className="flex flex-col gap-1 min-w-[140px]">
                <Label className="text-xs text-muted-foreground">{f.name}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={v === undefined || v === '' ? '' : v === '1' || v === 'true' ? '1' : '0'}
                  onChange={e => {
                    const x = e.target.value;
                    set(f.code, x === '' ? undefined : x);
                  }}
                >
                  <option value="">—</option>
                  <option value="1">Да</option>
                  <option value="0">Нет</option>
                </select>
              </div>
            );
          }

          if (f.ui_type === 'select' && f.options.length) {
            const selected = (values[f.code] as string[] | undefined) ?? [];
            return (
              <div key={f.code} className="flex flex-col gap-1 min-w-[180px] max-w-[280px]">
                <Label className="text-xs text-muted-foreground">{f.name}</Label>
                <select
                  multiple
                  className="flex h-24 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={selected}
                  onChange={e => {
                    const sel = Array.from(e.target.selectedOptions).map(o => o.value);
                    set(f.code, sel.length ? sel : undefined);
                  }}
                >
                  {f.options.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={f.code} className="flex flex-col gap-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">{f.name}</Label>
              <Input
                className="h-9"
                value={values[f.code] ?? ''}
                onChange={e => set(f.code, e.target.value || undefined)}
              />
            </div>
          );
        })}

        <div className="flex gap-2 ml-auto">
          <Button type="button" size="sm" onClick={onApply}>
            Применить
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onReset}>
            Сброс
          </Button>
        </div>
      </div>
    </div>
  );
}
