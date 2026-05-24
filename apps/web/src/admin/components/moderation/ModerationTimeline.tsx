const ACTION_LABELS: Record<string, string> = {
  draft_create: 'Создан черновик',
  draft_save: 'Автосохранение',
  submit_publish: 'Отправлено на публикацию',
  submit_submit_review: 'Отправлено на модерацию',
  submit_draft: 'Сохранено как черновик',
  moderation_approve: 'Одобрено',
  moderation_reject: 'Отклонено',
  moderation_request_changes: 'Запрошены правки',
  moderation_archive: 'Архивировано',
  moderation_restore: 'Восстановлено',
};

type HistoryRow = {
  id: number;
  action: string;
  note: string | null;
  createdAt: string;
  user: { fullName: string | null; email: string | null } | null;
};

type Props = {
  history: HistoryRow[];
};

export default function ModerationTimeline({ history }: Props) {
  if (!history.length) {
    return <p className="text-sm text-muted-foreground">История пуста</p>;
  }

  return (
    <ol className="space-y-3 border-l-2 border-border ml-2 pl-4">
      {history.map((h) => (
        <li key={h.id} className="relative text-sm">
          <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
          <p className="font-medium">{ACTION_LABELS[h.action] ?? h.action}</p>
          <p className="text-xs text-muted-foreground">
            {h.user?.fullName ?? h.user?.email ?? 'Система'} ·{' '}
            {new Date(h.createdAt).toLocaleString('ru-RU')}
          </p>
          {h.note ? <p className="text-xs mt-1 text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1">{h.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
