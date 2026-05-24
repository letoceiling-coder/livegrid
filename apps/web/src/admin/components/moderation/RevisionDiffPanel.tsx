import type { RevisionDiffResult } from '@lg/shared';

type Props = {
  diff: RevisionDiffResult;
};

export default function RevisionDiffPanel({ diff }: Props) {
  const changed = diff.fields.filter((f) => f.changed);
  const byCategory = {
    core: changed.filter((f) => f.category === 'core'),
    geo: changed.filter((f) => f.category === 'geo'),
    characteristics: changed.filter((f) => f.category === 'characteristics'),
    ownership: changed.filter((f) => f.category === 'ownership'),
    visibility: changed.filter((f) => f.category === 'visibility'),
  };

  if (!diff.hasChanges && !diff.media.mainPhotoChanged && !diff.media.added.length && !diff.media.removed.length) {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border p-4 bg-muted/20">
        Нет отличий между опубликованной версией и черновиком правок.
      </p>
    );
  }

  function Section({ title, items }: { title: string; items: typeof changed }) {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border p-3 bg-background text-sm">
              <span className="font-medium sm:col-span-1">{f.label}</span>
              <div className="sm:col-span-1">
                <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Опубликовано</p>
                <p className="break-words">{f.live}</p>
              </div>
              <div className="sm:col-span-1 border-l-0 sm:border-l pl-0 sm:pl-3 border-amber-200 bg-amber-50/50 rounded sm:rounded-none sm:bg-transparent">
                <p className="text-[10px] uppercase text-amber-700 mb-0.5">На модерации</p>
                <p className="break-words font-medium text-amber-900">{f.pending}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Основное" items={byCategory.core} />
      <Section title="Адрес и карта" items={byCategory.geo} />
      <Section title="Характеристики" items={byCategory.characteristics} />
      <Section title="Владение" items={byCategory.ownership} />
      <Section title="Видимость" items={byCategory.visibility} />
      <p className="text-xs text-muted-foreground">
        Изменено полей: {diff.changedFieldCount}
      </p>
    </div>
  );
}
