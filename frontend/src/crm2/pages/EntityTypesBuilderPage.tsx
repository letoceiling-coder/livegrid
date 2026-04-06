import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminEntityTypeMutations, useAdminEntityTypes } from '../hooks/useAdminEntityTypes';
import type { AdminEntityFieldSchema, AdminEntityTypeSchema } from '../types/schema';

const FIELD_TYPES = [
  'string',
  'integer',
  'float',
  'boolean',
  'date',
  'datetime',
  'text',
  'select',
  'multi_select',
] as const;

function parseEnumJson(raw: string): string[] | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const p = JSON.parse(t) as unknown;
    if (!Array.isArray(p)) return null;
    return p.map(x => String(x));
  } catch {
    return null;
  }
}

export default function EntityTypesBuilderPage() {
  const { data: types, isLoading, isError, error, refetch } = useAdminEntityTypes();
  const { createType, createField, updateField, deleteField } = useAdminEntityTypeMutations();

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState<AdminEntityTypeSchema | null>(null);

  const [fieldDraft, setFieldDraft] = useState({
    code: '',
    name: '',
    type: 'string' as (typeof FIELD_TYPES)[number],
    group: '',
    is_required: false,
    is_filterable: false,
    is_searchable: false,
    relation_target_type: '',
    relation_label_field: '',
    validation_min: '',
    validation_max: '',
    sort_order: '0',
  });

  const [editing, setEditing] = useState<AdminEntityFieldSchema | null>(null);

  const sortedTypes = useMemo(() => [...(types ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code)), [types]);

  const resetFieldDraft = () =>
    setFieldDraft({
      code: '',
      name: '',
      type: 'string',
      group: '',
      is_required: false,
      is_filterable: false,
      is_searchable: false,
      relation_target_type: '',
      relation_label_field: '',
      validation_min: '',
      validation_max: '',
      validation_pattern: '',
      validation_min_length: '',
      validation_max_length: '',
      validation_enum_json: '',
      sort_order: '0',
    });

  const onCreateType = async () => {
    const code = newCode.trim().toLowerCase();
    const name = newName.trim();
    if (!code || !name) {
      toast.error('Укажите код и название');
      return;
    }
    try {
      await createType.mutateAsync({ code, name });
      toast.success('Тип создан');
      setNewCode('');
      setNewName('');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const onAddField = async () => {
    if (!selected) return;
    const code = fieldDraft.code.trim().toLowerCase();
    const name = fieldDraft.name.trim();
    if (!code || !name) {
      toast.error('Код и название поля обязательны');
      return;
    }
    const body: Record<string, unknown> = {
      code,
      name,
      type: fieldDraft.type,
      is_required: fieldDraft.is_required,
      is_filterable: fieldDraft.is_filterable,
      is_searchable: fieldDraft.is_searchable,
      sort_order: parseInt(fieldDraft.sort_order, 10) || 0,
    };
    if (fieldDraft.group.trim()) body.group = fieldDraft.group.trim();
    if (fieldDraft.relation_target_type.trim()) {
      body.relation_target_type = fieldDraft.relation_target_type.trim();
      if (fieldDraft.relation_label_field.trim()) body.relation_label_field = fieldDraft.relation_label_field.trim();
    }
    if (fieldDraft.validation_min !== '') body.validation_min = Number(fieldDraft.validation_min);
    if (fieldDraft.validation_max !== '') body.validation_max = Number(fieldDraft.validation_max);
    if (fieldDraft.validation_pattern.trim()) body.validation_pattern = fieldDraft.validation_pattern.trim();
    if (fieldDraft.validation_min_length !== '') body.validation_min_length = parseInt(fieldDraft.validation_min_length, 10);
    if (fieldDraft.validation_max_length !== '') body.validation_max_length = parseInt(fieldDraft.validation_max_length, 10);
    const en = parseEnumJson(fieldDraft.validation_enum_json);
    if (en?.length) body.validation_enum = en;

    try {
      await createField.mutateAsync({ typeId: selected.id, body });
      toast.success('Поле добавлено');
      resetFieldDraft();
      const fresh = await refetch();
      const t = fresh.data?.find(x => x.id === selected.id);
      if (t) setSelected(t);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const onSaveEditField = async () => {
    if (!editing) return;
    const body: Record<string, unknown> = {
      name: editing.name,
      group: editing.group,
      type: editing.type,
      is_required: editing.is_required,
      is_filterable: editing.is_filterable,
      is_searchable: editing.is_searchable,
      sort_order: editing.sort_order,
      relation_target_type: editing.relation_target_type || null,
      relation_label_field: editing.relation_label_field || null,
      validation_min: editing.validation_min,
      validation_max: editing.validation_max,
      validation_pattern: editing.validation_pattern,
      validation_min_length: editing.validation_min_length,
      validation_max_length: editing.validation_max_length,
      validation_enum: editing.validation_enum,
    };
    try {
      await updateField.mutateAsync({ id: editing.id, body });
      toast.success('Поле обновлено');
      setEditing(null);
      refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка схемы…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 p-6 text-center space-y-3">
        <p className="text-destructive">{(error as Error).message}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Конструктор типов</h1>
        <p className="text-sm text-muted-foreground mt-1">Создание типов и полей через API — без правок кода.</p>
      </div>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Новый тип</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Код (латиница, snake_case)</Label>
            <Input className="font-mono" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="my_entity" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Название</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Моя сущность" />
          </div>
          <Button type="button" onClick={onCreateType} disabled={createType.isPending}>
            {createType.isPending ? 'Создание…' : 'Создать тип'}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border overflow-hidden">
        <h2 className="font-semibold p-4 border-b bg-muted/30">Типы</h2>
        {sortedTypes.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Нет типов</p>
        ) : (
          <ul className="divide-y">
            {sortedTypes.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-muted/40 ${selected?.id === t.id ? 'bg-muted/60' : ''}`}
                  onClick={() => {
                    setSelected(t);
                    setEditing(null);
                  }}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                  <span className="text-xs text-muted-foreground">{t.fields.length} полей</span>
                  {t.is_active ? null : <span className="text-xs text-muted-foreground">неактивен</span>}
                  <Link
                    to={`/crm2/entities/${t.code}`}
                    className="text-xs text-primary hover:underline ml-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    Открыть записи →
                  </Link>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <section className="rounded-xl border p-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Поля: <span className="font-mono">{selected.code}</span>
            </h2>
          </div>

          {selected.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет полей</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-2">Код</th>
                    <th className="p-2">Название</th>
                    <th className="p-2">Тип</th>
                    <th className="p-2">Обяз.</th>
                    <th className="p-2">Фильтр</th>
                    <th className="p-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {[...selected.fields]
                    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
                    .map(f => (
                      <tr key={f.id} className="border-b border-border/60">
                        <td className="p-2 font-mono">{f.code}</td>
                        <td className="p-2">{f.name}</td>
                        <td className="p-2">
                          {f.type}
                          {f.relation_target_type ? ` → ${f.relation_target_type}` : ''}
                        </td>
                        <td className="p-2">{f.is_required ? 'да' : ''}</td>
                        <td className="p-2">{f.is_filterable ? 'да' : ''}</td>
                        <td className="p-2 flex gap-0.5">
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ ...f })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deleteField.isPending}
                            onClick={async () => {
                              if (!window.confirm(`Удалить поле «${f.code}»?`)) return;
                              try {
                                await deleteField.mutateAsync(f.id);
                                toast.success('Поле удалено');
                                const fresh = await refetch();
                                if (selected) {
                                  const t = fresh.data?.find(x => x.id === selected.id);
                                  if (t) setSelected(t);
                                  else setSelected(null);
                                }
                                setEditing(null);
                              } catch (e: unknown) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg bg-muted/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold">{editing ? 'Редактирование поля' : 'Новое поле'}</h3>
            {editing ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Код</Label>
                  <Input className="font-mono" value={editing.code} disabled />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Название</Label>
                  <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Тип значения</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.type}
                    onChange={e => setEditing({ ...editing, type: e.target.value as AdminEntityFieldSchema['type'] })}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Группа UI</Label>
                  <Input value={editing.group ?? ''} onChange={e => setEditing({ ...editing, group: e.target.value || null })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_required} onChange={e => setEditing({ ...editing, is_required: e.target.checked })} />
                  Обязательное
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_filterable} onChange={e => setEditing({ ...editing, is_filterable: e.target.checked })} />
                  В фильтрах
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={editing.is_searchable} onChange={e => setEditing({ ...editing, is_searchable: e.target.checked })} />
                  Поиск
                </label>
                <div className="space-y-1">
                  <Label className="text-xs">Связь: код типа</Label>
                  <Input
                    className="font-mono"
                    value={editing.relation_target_type ?? ''}
                    onChange={e => setEditing({ ...editing, relation_target_type: e.target.value || null })}
                    placeholder="builder"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Поле подписи (цель)</Label>
                  <Input
                    className="font-mono"
                    value={editing.relation_label_field ?? ''}
                    onChange={e => setEditing({ ...editing, relation_label_field: e.target.value || null })}
                    placeholder="name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min (число)</Label>
                  <Input
                    type="number"
                    value={editing.validation_min ?? ''}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        validation_min: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max (число)</Label>
                  <Input
                    type="number"
                    value={editing.validation_max ?? ''}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        validation_max: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Regex (PCRE)</Label>
                  <Input
                    className="font-mono text-sm"
                    value={editing.validation_pattern ?? ''}
                    onChange={e => setEditing({ ...editing, validation_pattern: e.target.value || null })}
                    placeholder="^[a-z0-9_-]+$"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min длина строки</Label>
                  <Input
                    type="number"
                    value={editing.validation_min_length ?? ''}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        validation_min_length: e.target.value === '' ? null : parseInt(e.target.value, 10),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max длина строки</Label>
                  <Input
                    type="number"
                    value={editing.validation_max_length ?? ''}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        validation_max_length: e.target.value === '' ? null : parseInt(e.target.value, 10),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Enum (JSON-массив строк)</Label>
                  <textarea
                    className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    value={editing.validation_enum == null || editing.validation_enum.length === 0 ? '' : JSON.stringify(editing.validation_enum)}
                    onChange={e => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        setEditing({ ...editing, validation_enum: null });
                        return;
                      }
                      const parsed = parseEnumJson(raw);
                      if (parsed) setEditing({ ...editing, validation_enum: parsed });
                    }}
                    placeholder='["one","two"]'
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Порядок</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="button" onClick={onSaveEditField} disabled={updateField.isPending}>
                    {updateField.isPending ? 'Сохранение…' : 'Сохранить поле'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Код поля</Label>
                  <Input className="font-mono" value={fieldDraft.code} onChange={e => setFieldDraft(d => ({ ...d, code: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Название</Label>
                  <Input value={fieldDraft.name} onChange={e => setFieldDraft(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Тип</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={fieldDraft.type}
                    onChange={e => setFieldDraft(d => ({ ...d, type: e.target.value as (typeof FIELD_TYPES)[number] }))}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Группа UI</Label>
                  <Input value={fieldDraft.group} onChange={e => setFieldDraft(d => ({ ...d, group: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldDraft.is_required}
                    onChange={e => setFieldDraft(d => ({ ...d, is_required: e.target.checked }))}
                  />
                  Обязательное
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldDraft.is_filterable}
                    onChange={e => setFieldDraft(d => ({ ...d, is_filterable: e.target.checked }))}
                  />
                  В фильтрах
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={fieldDraft.is_searchable}
                    onChange={e => setFieldDraft(d => ({ ...d, is_searchable: e.target.checked }))}
                  />
                  Участвует в поиске
                </label>
                <div className="space-y-1">
                  <Label className="text-xs">Связь: целевой тип (code)</Label>
                  <Input
                    className="font-mono"
                    value={fieldDraft.relation_target_type}
                    onChange={e => setFieldDraft(d => ({ ...d, relation_target_type: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Поле подписи (в целевом типе)</Label>
                  <Input
                    className="font-mono"
                    value={fieldDraft.relation_label_field}
                    onChange={e => setFieldDraft(d => ({ ...d, relation_label_field: e.target.value }))}
                    placeholder="name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    value={fieldDraft.validation_min}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_min: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max</Label>
                  <Input
                    type="number"
                    value={fieldDraft.validation_max}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_max: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Regex (PCRE)</Label>
                  <Input
                    className="font-mono text-sm"
                    value={fieldDraft.validation_pattern}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_pattern: e.target.value }))}
                    placeholder="^[a-z]+$"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min длина</Label>
                  <Input
                    type="number"
                    value={fieldDraft.validation_min_length}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_min_length: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max длина</Label>
                  <Input
                    type="number"
                    value={fieldDraft.validation_max_length}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_max_length: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Enum JSON</Label>
                  <textarea
                    className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    value={fieldDraft.validation_enum_json}
                    onChange={e => setFieldDraft(d => ({ ...d, validation_enum_json: e.target.value }))}
                    placeholder='["a","b"]'
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Порядок</Label>
                  <Input
                    type="number"
                    value={fieldDraft.sort_order}
                    onChange={e => setFieldDraft(d => ({ ...d, sort_order: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" onClick={onAddField} disabled={createField.isPending}>
                    {createField.isPending ? 'Добавление…' : 'Добавить поле'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
