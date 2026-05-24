import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutosaveStatus, PublishAction } from '@/admin/lib/listingWizardDraft';
import { LISTING_VISIBILITY_LABEL } from '@/admin/lib/listingVisibility';
import type { ListingVisibility } from '@lg/shared';

type Props = {
  step: number;
  stepCount: number;
  canGoNext: boolean;
  saving: boolean;
  autosaveStatus: AutosaveStatus;
  visibility: ListingVisibility | null;
  moderationNote: string | null;
  hasPendingRevision: boolean;
  moderationEnabled: boolean;
  isAgent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveLocal: () => void;
  publishAction: PublishAction;
  onPublishAction: (a: PublishAction) => void;
  onSubmit: () => void;
};

function autosaveLabel(status: AutosaveStatus): string {
  switch (status) {
    case 'pending':
      return 'Сохранение…';
    case 'saving':
      return 'Сохранение на сервер…';
    case 'saved':
      return 'Сохранено';
    case 'error':
      return 'Ошибка автосохранения';
    case 'conflict':
      return 'Конфликт версий';
    default:
      return '';
  }
}

export default function ListingWizardFooter({
  step,
  stepCount,
  canGoNext,
  saving,
  autosaveStatus,
  visibility,
  moderationNote,
  hasPendingRevision,
  moderationEnabled,
  isAgent,
  onPrev,
  onNext,
  onSaveLocal,
  publishAction,
  onPublishAction,
  onSubmit,
}: Props) {
  const isLast = step >= stepCount - 1;

  const publishOptions: Array<{
    value: PublishAction;
    label: string;
    hint: string;
  }> = [
    { value: 'draft', label: 'Черновик', hint: 'Не показывать на сайте' },
    ...(moderationEnabled && isAgent
      ? [{ value: 'submit_review' as const, label: 'На модерацию', hint: 'Отправить менеджеру' }]
      : [{ value: 'publish' as const, label: 'Опубликовать', hint: 'Сразу в каталоге' }]),
    { value: 'archive', label: 'В архив', hint: 'Сохранить скрытым' },
  ];

  const handleSubmit = () => {
    if (publishAction === 'publish' && !confirm('Опубликовать объект на сайте?')) return;
    if (publishAction === 'submit_review' && !confirm('Отправить объект на модерацию?')) return;
    onSubmit();
  };

  return (
    <>
      {visibility && visibility !== 'DRAFT' ? (
        <p className="text-xs mb-3 inline-flex items-center gap-2 rounded-lg border px-2 py-1 bg-muted/40">
          Статус: {LISTING_VISIBILITY_LABEL[visibility]}
          {hasPendingRevision ? ' · есть неопубликованные правки' : null}
          {moderationNote ? ` · ${moderationNote}` : null}
        </p>
      ) : null}

      {isLast ? (
        <div className="space-y-3 mb-4">
          <p className="text-sm font-medium">Действие после сохранения</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {publishOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPublishAction(opt.value)}
                className={`rounded-xl border p-3 text-left transition min-h-[72px] ${
                  publishAction === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <span className="text-sm font-semibold block">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 mt-4 bg-background/95 backdrop-blur border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {autosaveLabel(autosaveStatus) ? (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 order-first sm:order-none sm:absolute sm:left-1/2 sm:-translate-x-1/2">
            {autosaveStatus === 'error' || autosaveStatus === 'conflict' ? (
              <CloudOff className="w-3.5 h-3.5" />
            ) : autosaveStatus === 'saved' ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {autosaveLabel(autosaveStatus)}
          </p>
        ) : null}

        <Button type="button" variant="outline" onClick={onPrev} disabled={step === 0} className="min-h-11">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Button type="button" variant="ghost" onClick={onSaveLocal} className="min-h-11 hidden sm:inline-flex">
          <Save className="w-4 h-4 mr-2" />
          Локально
        </Button>

        {!isLast ? (
          <Button type="button" onClick={onNext} disabled={!canGoNext} className="min-h-11 flex-1 sm:flex-none">
            Далее
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={saving} className="min-h-11 flex-1 sm:flex-none">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Сохранение…
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {publishAction === 'publish'
                  ? 'Опубликовать'
                  : publishAction === 'submit_review'
                    ? 'На модерацию'
                    : 'Сохранить'}
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );
}
