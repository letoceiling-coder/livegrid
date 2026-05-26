import AboutPlatform from '@/components/AboutPlatform';
import { Switch } from '@/components/ui/switch';
import {
  ABOUT_PLATFORM_ICON_OPTIONS,
  normalizeAboutPlatformSettings,
  type AboutPlatformStat,
} from '@/shared/lib/about-platform-cms';

interface Props {
  settings: Record<string, unknown>;
  onUpdate: (s: Record<string, unknown>) => void;
}

function statId() {
  return `s-${Date.now().toString(36)}`;
}

export default function AboutEditor({ settings, onUpdate }: Props) {
  const normalized = normalizeAboutPlatformSettings(settings);
  const stats = [...normalized.stats].sort((a, b) => a.order - b.order);

  const patch = (partial: Record<string, unknown>) => onUpdate(partial);

  const setStats = (next: AboutPlatformStat[]) => patch({ stats: next });

  const updateStat = (id: string, field: keyof AboutPlatformStat, value: string | boolean | number) => {
    setStats(stats.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const moveStat = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= stats.length) return;
    const copy = [...stats];
    const tmp = copy[index].order;
    copy[index] = { ...copy[index], order: copy[j].order };
    copy[j] = { ...copy[j], order: tmp };
    setStats(copy);
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Eyebrow</label>
          <input
            value={normalized.eyebrow}
            onChange={(e) => patch({ eyebrow: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Фон секции</label>
          <select
            value={normalized.backgroundVariant}
            onChange={(e) => patch({ backgroundVariant: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          >
            <option value="muted">Мягкий (muted)</option>
            <option value="white">Белый</option>
            <option value="default">По умолчанию</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Заголовок</label>
        <input
          value={normalized.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Описание (2–3 строки)</label>
        <textarea
          value={normalized.description}
          onChange={(e) => patch({ description: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          rows={3}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Основная кнопка — текст</label>
          <input
            value={normalized.primaryButtonText}
            onChange={(e) => patch({ primaryButtonText: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Основная кнопка — URL</label>
          <input
            value={normalized.primaryButtonUrl}
            onChange={(e) => patch({ primaryButtonUrl: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
            placeholder="/login"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Вторая кнопка — текст</label>
          <input
            value={normalized.secondaryButtonText}
            onChange={(e) => patch({ secondaryButtonText: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Вторая кнопка — URL</label>
          <input
            value={normalized.secondaryButtonUrl}
            onChange={(e) => patch({ secondaryButtonUrl: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
            placeholder="/catalog"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Изображение (URL)</label>
          <input
            value={normalized.imageUrl}
            onChange={(e) => patch({ imageUrl: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Alt текст</label>
          <input
            value={normalized.imageAlt}
            onChange={(e) => patch({ imageAlt: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Изображение mobile (опционально)</label>
          <input
            value={normalized.imageUrlMobile}
            onChange={(e) => patch({ imageUrlMobile: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
            placeholder="Оставьте пустым — как на desktop"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Статистика</label>
          <button
            type="button"
            className="text-xs text-primary font-medium hover:underline"
            onClick={() =>
              setStats([
                ...stats,
                {
                  id: statId(),
                  value: '',
                  label: '',
                  icon: 'building2',
                  enabled: true,
                  order: stats.length,
                },
              ])
            }
          >
            + Добавить
          </button>
        </div>
        <div className="space-y-2">
          {stats.map((stat, index) => (
            <div key={stat.id} className="border rounded-xl p-3 bg-background space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch
                      checked={stat.enabled}
                      onCheckedChange={(v) => updateStat(stat.id, 'enabled', v)}
                    />
                    Вкл
                  </label>
                  <button type="button" className="text-xs px-1.5 py-0.5 rounded border" disabled={index === 0} onClick={() => moveStat(index, -1)}>↑</button>
                  <button type="button" className="text-xs px-1.5 py-0.5 rounded border" disabled={index === stats.length - 1} onClick={() => moveStat(index, 1)}>↓</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  value={stat.value}
                  onChange={(e) => updateStat(stat.id, 'value', e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="65 122"
                />
                <input
                  value={stat.label}
                  onChange={(e) => updateStat(stat.id, 'label', e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm sm:col-span-2"
                  placeholder="объектов в каталоге"
                />
                <select
                  value={stat.icon}
                  onChange={(e) => updateStat(stat.id, 'icon', e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm"
                >
                  {ABOUT_PLATFORM_ICON_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Предпросмотр</p>
        <div className="border rounded-2xl overflow-hidden bg-muted/30 pointer-events-none">
          <AboutPlatform settings={normalized} preview />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Сохраните страницу — блок на сайте обновится из CMS (localStorage).
        </p>
      </div>
    </div>
  );
}
