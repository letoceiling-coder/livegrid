import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { EntityFieldSchema, EntityRecordDto } from '../types/schema';

interface Props {
  fields: EntityFieldSchema[];
  rows: EntityRecordDto[];
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (code: string) => void;
  selected: Set<number>;
  onToggle: (id: number, add: boolean) => void;
  onToggleAll: (ids: number[], add: boolean) => void;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
  return String(v);
}

export function EntityTable({
  fields,
  rows,
  sortField,
  sortDir,
  onSort,
  selected,
  onToggle,
  onToggleAll,
}: Props) {
  const cols = [...fields].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
  const allIds = rows.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="w-10 p-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={c => onToggleAll(allIds, c === true)}
                aria-label="Выбрать все"
              />
            </th>
            <th className="text-left p-2 font-medium whitespace-nowrap">ID</th>
            {cols.map(f => (
              <th key={f.code} className="text-left p-2 font-medium whitespace-nowrap">
                <button
                  type="button"
                  className={cn(
                    'hover:text-primary inline-flex items-center gap-1',
                    sortField === f.code && 'text-primary font-semibold',
                  )}
                  onClick={() => onSort(f.code)}
                >
                  {f.name}
                  {sortField === f.code ? (sortDir === 'desc' ? '↓' : '↑') : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
              <td className="p-2">
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={c => onToggle(row.id, c === true)}
                  aria-label={`Выбрать ${row.id}`}
                />
              </td>
              <td className="p-2 font-mono text-muted-foreground">{row.id}</td>
              {cols.map(f => (
                <td key={f.code} className="p-2 max-w-[240px] truncate" title={fmt(row.values[f.code])}>
                  {fmt(row.values[f.code])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="p-6 text-center text-muted-foreground">Нет данных</p> : null}
    </div>
  );
}
