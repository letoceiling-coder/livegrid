import {
  LISTING_FIELD_REGISTRY,
  type ListingFieldDefinition,
  type ListingWizardUiKind,
} from '@lg/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';

type RefOpt = { id: number; name: string };

type Props = {
  kind: ListingWizardUiKind;
  draft: ListingWizardDraft;
  onChange: (patch: Partial<ListingWizardDraft>) => void;
  roomTypes: RefOpt[];
  finishings: RefOpt[];
};

function getGroupValue(
  draft: ListingWizardDraft,
  group: ListingFieldDefinition['group'],
  key: string,
): string | boolean {
  const g = draft[group] as Record<string, string | boolean>;
  return g[key] ?? (typeof g[key] === 'boolean' ? false : '');
}

function setGroupValue(
  draft: ListingWizardDraft,
  group: ListingFieldDefinition['group'],
  key: string,
  value: string | boolean,
): Partial<ListingWizardDraft> {
  return {
    [group]: { ...draft[group], [key]: value },
  } as Partial<ListingWizardDraft>;
}

function FieldControl({
  field,
  value,
  onValue,
  roomTypes,
  finishings,
}: {
  field: ListingFieldDefinition;
  value: string | boolean;
  onValue: (v: string | boolean) => void;
  roomTypes: RefOpt[];
  finishings: RefOpt[];
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer min-h-11">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onValue(e.target.checked)}
          className="w-4 h-4"
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select') {
    const opts =
      field.refKey === 'room-types'
        ? roomTypes.map((x) => ({ value: String(x.id), label: x.name }))
        : field.refKey === 'finishings'
          ? finishings.map((x) => ({ value: String(x.id), label: x.name }))
          : (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));

    return (
      <select
        className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-11"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onValue(e.target.value)}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[88px]"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onValue(e.target.value)}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <Input
      inputMode={field.type === 'integer' ? 'numeric' : field.type === 'number' ? 'decimal' : 'text'}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onValue(e.target.value)}
      placeholder={field.placeholder}
      className="min-h-11"
    />
  );
}

export default function ListingWizardDynamicFields({
  kind,
  draft,
  onChange,
  roomTypes,
  finishings,
}: Props) {
  const fields = LISTING_FIELD_REGISTRY[kind];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((field) => {
        const value = getGroupValue(draft, field.group, field.key);
        const span = field.colSpan === 2 ? 'col-span-1 sm:col-span-2' : '';
        return (
          <div key={field.key} className={`space-y-1 ${span}`}>
            {field.type !== 'boolean' ? (
              <Label>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
            ) : null}
            <FieldControl
              field={field}
              value={value}
              onValue={(v) => onChange(setGroupValue(draft, field.group, field.key, v))}
              roomTypes={roomTypes}
              finishings={finishings}
            />
          </div>
        );
      })}
    </div>
  );
}
