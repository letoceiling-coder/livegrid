import HelpSelectionCta from '@/components/HelpSelectionCta';
import { normalizeHelpSelectionSettings } from '@/shared/lib/help-selection-cms';

interface Props {
  settings: Record<string, unknown>;
  onUpdate: (s: Record<string, unknown>) => void;
}

export default function HelpSelectionEditor({ settings, onUpdate }: Props) {
  const normalized = normalizeHelpSelectionSettings(settings);
  const patch = (partial: Record<string, unknown>) => onUpdate(partial);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Заголовок</label>
        <input
          value={normalized.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Описание (1 строка)</label>
        <input
          value={normalized.description}
          onChange={(e) => patch({ description: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Кнопка — текст</label>
          <input
            value={normalized.buttonText}
            onChange={(e) => patch({ buttonText: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Кнопка — URL</label>
          <input
            value={normalized.buttonUrl}
            onChange={(e) => patch({ buttonUrl: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
            placeholder="#consult или /contacts"
          />
          <p className="text-[10px] text-muted-foreground mt-1">#consult — открыть форму консультации на главной</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Фон</label>
        <select
          value={normalized.backgroundVariant}
          onChange={(e) => patch({ backgroundVariant: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        >
          <option value="soft-blue">Мягкий акцент</option>
          <option value="muted">Нейтральный</option>
          <option value="white">Белый</option>
        </select>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Предпросмотр</p>
        <div className="border rounded-2xl overflow-hidden pointer-events-none">
          <HelpSelectionCta settings={normalized} preview />
        </div>
      </div>
    </div>
  );
}
