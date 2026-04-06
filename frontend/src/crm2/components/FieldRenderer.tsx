import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { EntityFieldSchema, EntityRecordDto } from '../types/schema';
import { searchEntitiesForRelation } from '../hooks/useEntities';
import { v2 } from '../api/v2Client';
import {
  getRelationSearchCache,
  relationSearchCacheKey,
  setRelationSearchCache,
} from '../lib/relationSearchCache';

function fieldError(errors: Record<string, string[]> | undefined, code: string): string | undefined {
  if (!errors?.[code]?.length) return undefined;
  return errors[code]![0];
}

interface FieldRendererProps {
  field: EntityFieldSchema;
  value: unknown;
  onChange: (code: string, v: unknown) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
}

export function FieldRenderer({ field, value, onChange, errors, disabled }: FieldRendererProps) {
  const err = fieldError(errors, field.code);
  const ui = field.ui_type;

  if (field.relation_target_type) {
    return (
      <RelationEntityField
        field={field}
        value={value}
        onChange={onChange}
        error={err}
        disabled={disabled}
      />
    );
  }

  switch (ui) {
    case 'boolean':
      return (
        <div className="flex flex-col gap-1.5">
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border border-transparent px-2 py-1 -mx-2 -my-1',
              err && 'border-destructive',
            )}
          >
            <Checkbox
              id={field.code}
              checked={Boolean(value)}
              disabled={disabled}
              onCheckedChange={c => onChange(field.code, c === true)}
            />
            <Label htmlFor={field.code} className="font-normal cursor-pointer">
              {field.name}
              {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
            </Label>
          </div>
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );

    case 'number':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field.code}>
            {field.name}
            {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
          </Label>
          <Input
            id={field.code}
            type="number"
            step={field.type === 'float' ? 'any' : '1'}
            disabled={disabled}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={e => {
              const t = e.target.value;
              if (t === '') {
                onChange(field.code, null);
                return;
              }
              onChange(field.code, field.type === 'float' ? parseFloat(t) : parseInt(t, 10));
            }}
            className={err ? 'border-destructive' : undefined}
          />
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );

    case 'select':
      return (
        <div className="flex flex-col gap-1.5">
          <Label>
            {field.name}
            {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
          </Label>
          <Select
            disabled={disabled}
            value={value === null || value === undefined ? '' : String(value)}
            onValueChange={v => onChange(field.code, v)}
          >
            <SelectTrigger className={err ? 'border-destructive' : undefined}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(o => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );

    case 'date':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field.code}>
            {field.name}
            {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
          </Label>
          <Input
            id={field.code}
            type={field.type === 'datetime' ? 'datetime-local' : 'date'}
            disabled={disabled}
            value={value === null || value === undefined ? '' : String(value).slice(0, 16)}
            onChange={e => onChange(field.code, e.target.value || null)}
            className={err ? 'border-destructive' : undefined}
          />
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );

    case 'text':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field.code}>
            {field.name}
            {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
          </Label>
          <textarea
            id={field.code}
            disabled={disabled}
            rows={4}
            className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${err ? 'border-destructive' : ''}`}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={e => onChange(field.code, e.target.value)}
          />
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );

    default:
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field.code}>
            {field.name}
            {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
          </Label>
          <Input
            id={field.code}
            disabled={disabled}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={e => onChange(field.code, e.target.value)}
            className={err ? 'border-destructive' : undefined}
          />
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      );
  }
}

function RelationEntityField({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: EntityFieldSchema;
  value: unknown;
  onChange: (code: string, v: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const target = field.relation_target_type!;
  const labelCode = field.relation_label_field?.trim() || 'name';
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<{ id: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      setResolvedLabel(null);
      return;
    }
    const id = Number(value);
    if (!Number.isFinite(id)) {
      setResolvedLabel(null);
      return;
    }
    const ac = new AbortController();
    v2
      .get<{ data: EntityRecordDto }>(`/entities/${target}/${id}`, { signal: ac.signal })
      .then(res => {
        const vals = res.data.values ?? {};
        const raw = vals[labelCode];
        setResolvedLabel(
          raw != null && raw !== ''
            ? String(raw)
            : vals.name != null
              ? String(vals.name)
              : `#${id}`,
        );
      })
      .catch(() => setResolvedLabel(`#${id}`));
    return () => ac.abort();
  }, [target, value, labelCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(() => {
      const key = relationSearchCacheKey(target, q, field.relation_label_field);
      const hit = getRelationSearchCache(key);
      if (hit) {
        setOpts(hit);
        setLoading(false);
        return;
      }
      setLoading(true);
      searchEntitiesForRelation(target, q, field.relation_label_field, ac.signal)
        .then(rows => {
          if (!ac.signal.aborted) {
            setRelationSearchCache(key, rows);
            setOpts(rows);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!ac.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q, open, target, field.relation_label_field]);

  const display =
    resolvedLabel != null
      ? `${resolvedLabel}`
      : value !== null && value !== undefined && value !== ''
        ? `…`
        : 'Выберите запись';

  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {field.name}
        {field.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      <Popover
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (next) {
            setQ('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('max-w-md justify-start font-normal', error && 'border-destructive')}
          >
            <span className="truncate">{display}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start" onOpenAutoFocus={e => e.preventDefault()}>
          <Input
            placeholder={`Поиск (${target})…`}
            value={q}
            disabled={disabled}
            onChange={e => setQ(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-auto rounded-md border text-sm">
            {loading ? (
              <p className="p-3 text-xs text-muted-foreground">Загрузка…</p>
            ) : opts.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Нет результатов</p>
            ) : (
              opts.map(o => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    onChange(field.code, o.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value !== null && value !== undefined && value !== '' ? (
        <Button type="button" variant="ghost" size="sm" className="w-fit -mt-1" onClick={() => onChange(field.code, null)} disabled={disabled}>
          Сбросить связь
        </Button>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function groupFields(fields: EntityFieldSchema[]): Map<string, EntityFieldSchema[]> {
  const m = new Map<string, EntityFieldSchema[]>();
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
  for (const f of sorted) {
    const g = f.group?.trim() || 'Прочее';
    if (!m.has(g)) m.set(g, []);
    m.get(g)!.push(f);
  }
  return m;
}
