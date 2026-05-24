import { useCallback, useRef, useState } from 'react';
import { GripVertical, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { LISTING_WIZARD_MEDIA_LIMITS } from '@lg/shared';
import { apiPostForm } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import MediaPickerDialog from '@/admin/components/MediaPickerDialog';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';
import { listingWizardMediaLabels, type ListingWizardKind } from '@/admin/lib/listingWizardConfig';

type Props = {
  draft: ListingWizardDraft;
  onChange: (patch: Partial<ListingWizardDraft>) => void;
};

type PickerTarget = null | 'main' | 'extra' | 'plan';

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function ListingWizardMediaStep({ draft, onChange }: Props) {
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kind = draft.kind as ListingWizardKind | null;
  const labels = kind ? listingWizardMediaLabels[kind] : { main: 'Главное фото', gallery: 'Галерея' };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      setUploadError('');
      setUploading(true);
      const urls: string[] = [];
      try {
        for (const file of arr) {
          if (!LISTING_WIZARD_MEDIA_LIMITS.allowedMime.includes(file.type as (typeof LISTING_WIZARD_MEDIA_LIMITS.allowedMime)[number])) {
            throw new Error(`Недопустимый формат: ${file.name}. Разрешены JPG, PNG, WebP, GIF`);
          }
          if (file.size > LISTING_WIZARD_MEDIA_LIMITS.maxFileSizeBytes) {
            throw new Error(`Файл ${file.name} больше 15 МБ`);
          }
          const fd = new FormData();
          fd.append('file', file);
          const res = await apiPostForm<{ url: string }>('/admin/media/upload', fd);
          if (res.url) urls.push(res.url);
        }
        if (urls.length === 1 && !draft.mainPhotoUrl) {
          onChange({ mainPhotoUrl: urls[0] });
        }
        const merged = Array.from(new Set([...draft.extraPhotoUrls, ...urls])).slice(
          0,
          LISTING_WIZARD_MEDIA_LIMITS.maxGallery,
        );
        onChange({ extraPhotoUrls: merged });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setUploading(false);
      }
    },
    [draft.extraPhotoUrls, draft.mainPhotoUrl, onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Перетащите фото сюда</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · до 15 МБ · макс. {LISTING_WIZARD_MEDIA_LIMITS.maxGallery} в галерее</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Загрузить файлы
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPicker('extra')} className="min-h-11">
            Из медиатеки
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploadError ? <p className="text-xs text-destructive mt-2">{uploadError}</p> : null}
      </div>

      <div className="space-y-1">
        <Label>{labels.main}</Label>
        <div className="flex items-center gap-3">
          {draft.mainPhotoUrl ? (
            <img src={draft.mainPhotoUrl} alt="" className="w-24 h-24 object-cover rounded-lg border" />
          ) : (
            <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => setPicker('main')} className="min-h-10">
              Выбрать главное
            </Button>
            {draft.mainPhotoUrl ? (
              <Button type="button" variant="ghost" onClick={() => onChange({ mainPhotoUrl: '' })}>
                Очистить
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {(kind === 'APARTMENT' || kind === 'ROOM') && labels.plan ? (
        <div className="space-y-1">
          <Label>{labels.plan}</Label>
          <div className="flex items-center gap-3">
            {draft.planUrl ? (
              <img src={draft.planUrl} alt="" className="w-24 h-24 object-contain rounded-lg border bg-muted/30" />
            ) : (
              <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                нет
              </div>
            )}
            <Button type="button" variant="outline" onClick={() => setPicker('plan')} className="min-h-10">
              Планировка
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>
          {labels.gallery} ({draft.extraPhotoUrls.length}/{LISTING_WIZARD_MEDIA_LIMITS.maxGallery})
        </Label>
        {draft.extraPhotoUrls.length === 0 ? (
          <p className="text-xs text-muted-foreground">Добавьте фото перетаскиванием или из медиатеки</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {draft.extraPhotoUrls.map((u, i) => (
              <div
                key={`${u}-${i}`}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx != null && dragIdx !== i) {
                    onChange({ extraPhotoUrls: reorder(draft.extraPhotoUrls, dragIdx, i) });
                  }
                  setDragIdx(null);
                }}
                className="relative group rounded-lg border overflow-hidden"
              >
                <img src={u} alt="" className="w-full h-24 object-cover" />
                <span className="absolute top-1 left-1 inline-flex w-6 h-6 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100">
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ extraPhotoUrls: draft.extraPhotoUrls.filter((_, idx) => idx !== i) })
                  }
                  className="absolute top-1 right-1 inline-flex w-7 h-7 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Удалить"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(v) => !v && setPicker(null)}
        title={
          picker === 'main' ? 'Главное фото' : picker === 'plan' ? 'Планировка' : 'Добавить в галерею'
        }
        multiple={picker === 'extra'}
        onPick={(items) => {
          if (picker === 'main' && items[0]) onChange({ mainPhotoUrl: items[0].url });
          else if (picker === 'plan' && items[0]) onChange({ planUrl: items[0].url });
          else if (picker === 'extra') {
            const urls = items.map((it) => it.url);
            onChange({
              extraPhotoUrls: Array.from(new Set([...draft.extraPhotoUrls, ...urls])).slice(
                0,
                LISTING_WIZARD_MEDIA_LIMITS.maxGallery,
              ),
            });
          }
          setPicker(null);
        }}
      />
    </div>
  );
}
