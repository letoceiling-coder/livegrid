import { FieldRenderer, groupFields } from './FieldRenderer';
import type { EntityFieldSchema } from '../types/schema';

interface Props {
  fields: EntityFieldSchema[];
  values: Record<string, unknown>;
  onChange: (code: string, v: unknown) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
}

export function EntityForm({ fields, values, onChange, errors, disabled }: Props) {
  const grouped = groupFields(fields);

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([groupName, groupFieldsList]) => (
        <section key={groupName}>
          <h3 className="text-sm font-semibold border-b pb-2 mb-4">{groupName}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {groupFieldsList.map(f => (
              <FieldRenderer
                key={f.code}
                field={f}
                value={values[f.code]}
                onChange={onChange}
                errors={errors}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
