import type { RevisionMediaDiff } from '@lg/shared';

type Props = {
  media: RevisionMediaDiff;
};

export default function MediaDiffGrid({ media }: Props) {
  return (
    <div className="space-y-4">
      {(media.mainPhotoChanged || media.planChanged) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {media.mainPhotoChanged ? (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700">Главное фото изменено</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Было</p>
                  {media.liveMain ? (
                    <img src={media.liveMain} alt="" className="w-full h-24 object-cover rounded border" />
                  ) : (
                    <div className="h-24 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">нет</div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Стало</p>
                  {media.pendingMain ? (
                    <img src={media.pendingMain} alt="" className="w-full h-24 object-cover rounded border border-amber-300" />
                  ) : (
                    <div className="h-24 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">нет</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {media.planChanged ? (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700">Планировка изменена</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {media.livePlan ? (
                    <img src={media.livePlan} alt="" className="w-full h-24 object-contain rounded border bg-muted/30" />
                  ) : (
                    <div className="h-24 rounded border border-dashed" />
                  )}
                </div>
                <div>
                  {media.pendingPlan ? (
                    <img src={media.pendingPlan} alt="" className="w-full h-24 object-contain rounded border border-amber-300 bg-muted/30" />
                  ) : (
                    <div className="h-24 rounded border border-dashed" />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {media.reordered ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Изменён порядок фото в галерее (те же файлы, другой порядок)
        </p>
      ) : null}

      {media.removed.length > 0 ? (
        <div>
          <p className="text-xs font-semibold mb-2">Удалённые фото ({media.removed.length})</p>
          <div className="flex flex-wrap gap-2">
            {media.removed.map((u) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="w-20 h-20 object-cover rounded border opacity-50 grayscale" />
                <span className="absolute top-1 left-1 text-[9px] bg-red-600 text-white px-1 rounded">−</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {media.added.length > 0 ? (
        <div>
          <p className="text-xs font-semibold mb-2">Новые фото ({media.added.length})</p>
          <div className="flex flex-wrap gap-2">
            {media.added.map((u) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="w-20 h-20 object-cover rounded border border-emerald-300" />
                <span className="absolute top-1 left-1 text-[9px] bg-emerald-600 text-white px-1 rounded">+</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!media.mainPhotoChanged &&
      !media.planChanged &&
      !media.added.length &&
      !media.removed.length &&
      !media.reordered ? (
        <p className="text-xs text-muted-foreground">Медиа без изменений</p>
      ) : null}
    </div>
  );
}
