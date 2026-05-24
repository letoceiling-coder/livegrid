import { useAuth } from '@/shared/hooks/useAuth';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';

type AgentRow = { id: string; fullName: string | null; email: string | null };

type Props = {
  draft: ListingWizardDraft;
  agents: AgentRow[];
  onChange: (patch: Partial<ListingWizardDraft>) => void;
};

export default function ListingWizardAgentStep({ draft, agents, onChange }: Props) {
  const { user } = useAuth();
  const canAssign = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'editor';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Для ручных объявлений ответственный агент отображается в карточке объекта. Фид-объекты используют контакт агентства.
      </p>

      <div className="space-y-2">
        <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input
            type="radio"
            name="ownerMode"
            checked={draft.ownerMode === 'self'}
            onChange={() =>
              onChange({
                ownerMode: 'self',
                ownerUserId: user?.id ?? null,
              })
            }
            className="mt-1"
          />
          <div>
            <span className="font-medium text-sm">Я ответственный</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.name ?? 'Текущий пользователь'} — объект будет привязан к вашему кабинету
            </p>
          </div>
        </label>

        {canAssign ? (
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="ownerMode"
              checked={draft.ownerMode === 'agent'}
              onChange={() => onChange({ ownerMode: 'agent' })}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <span className="font-medium text-sm">Назначить агента</span>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-11 disabled:opacity-60"
                value={draft.ownerUserId ?? ''}
                disabled={draft.ownerMode !== 'agent'}
                onChange={(e) => onChange({ ownerUserId: e.target.value || null })}
              >
                <option value="">— выберите агента —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName?.trim() || a.email || a.id}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ) : null}

        {canAssign ? (
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="ownerMode"
              checked={draft.ownerMode === 'agency'}
              onChange={() => onChange({ ownerMode: 'agency', ownerUserId: null })}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-sm">Контакт агентства</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Без персонального агента — публичный контакт агентства (как у фид-объектов)
              </p>
            </div>
          </label>
        ) : null}
      </div>

      {!canAssign ? (
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
          Агенты могут создавать объекты только от своего имени. Переназначение доступно менеджеру и администратору.
        </p>
      ) : null}
    </div>
  );
}
