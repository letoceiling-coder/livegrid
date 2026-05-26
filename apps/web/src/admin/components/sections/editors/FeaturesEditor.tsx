import AdditionalFeatures from '@/components/AdditionalFeatures';
import { Switch } from '@/components/ui/switch';
import { SECTION_ICON_OPTIONS } from '@/shared/lib/section-icons';
import { normalizePlatformToolsSettings, type PlatformToolItem } from '@/shared/lib/platform-tools-cms';

interface Props {
  settings: Record<string, unknown>;
  onUpdate: (s: Record<string, unknown>) => void;
}

function itemId() {
  return `t-${Date.now().toString(36)}`;
}

export default function FeaturesEditor({ settings, onUpdate }: Props) {
  const normalized = normalizePlatformToolsSettings(settings);
  const items = [...normalized.items].sort((a, b) => a.order - b.order);
  const patch = (partial: Record<string, unknown>) => onUpdate(partial);
  const setItems = (next: PlatformToolItem[]) => patch({ items: next });

  const updateItem = (id: string, field: keyof PlatformToolItem, value: string | boolean | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    const tmp = copy[index].order;
    copy[index] = { ...copy[index], order: copy[j].order };
    copy[j] = { ...copy[j], order: tmp };
    setItems(copy);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Заголовок секции</label>
        <input
          value={normalized.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Карточки инструментов</label>
        <button
          type="button"
          className="text-xs text-primary font-medium hover:underline"
          onClick={() =>
            setItems([
              ...items,
              { id: itemId(), icon: 'search', title: '', description: '', link: '/catalog', enabled: true, order: items.length },
            ])
          }
        >
          + Добавить
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="border rounded-xl p-3 bg-background space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">#{index + 1}</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch checked={item.enabled} onCheckedChange={(v) => updateItem(item.id, 'enabled', v)} />
                  Вкл
                </label>
                <button type="button" className="text-xs px-1.5 py-0.5 rounded border" disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                <button type="button" className="text-xs px-1.5 py-0.5 rounded border" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={item.title}
                onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
                placeholder="Заголовок"
              />
              <select
                value={item.icon}
                onChange={(e) => updateItem(item.id, 'icon', e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                {SECTION_ICON_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <input
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm sm:col-span-2"
                placeholder="Описание в одну строку"
              />
              <input
                value={item.link}
                onChange={(e) => updateItem(item.id, 'link', e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm sm:col-span-2"
                placeholder="/catalog или #consult"
              />
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Предпросмотр</p>
        <div className="border rounded-2xl overflow-hidden pointer-events-none">
          <AdditionalFeatures settings={normalized} preview />
        </div>
      </div>
    </div>
  );
}
