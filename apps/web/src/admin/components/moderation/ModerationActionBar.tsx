import { useState } from 'react';
import { Archive, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  draftVersion: number;
  pending: boolean;
  onAction: (action: string, note?: string) => void;
};

export default function ModerationActionBar({ draftVersion, pending, onAction }: Props) {
  const [note, setNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const submitReject = (action: 'reject' | 'request_changes') => {
    if (!note.trim()) return;
    if (!confirm(action === 'reject' ? 'Отклонить объявление?' : 'Запросить правки у агента?')) return;
    onAction(action, note.trim());
    setShowReject(false);
    setNote('');
  };

  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t space-y-3">
      {showReject ? (
        <div className="space-y-2">
          <Label>Причина (обязательно)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Укажите, что нужно исправить…"
            className="min-h-11"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" disabled={!note.trim() || pending} onClick={() => submitReject('reject')} className="min-h-11">
              Отклонить
            </Button>
            <Button type="button" variant="outline" disabled={!note.trim() || pending} onClick={() => submitReject('request_changes')} className="min-h-11">
              Запросить правки
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowReject(false)} className="min-h-11">
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('Одобрить и опубликовать изменения?')) return;
              onAction('approve');
            }}
            className="min-h-11 flex-1 sm:flex-none"
          >
            {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Одобрить
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setShowReject(true)} className="min-h-11">
            <X className="w-4 h-4 mr-2" />
            Отклонить
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm('Вернуть в черновик?')) return;
              onAction('restore');
            }}
            className="min-h-11"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            В черновик
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm('Архивировать объявление?')) return;
              onAction('archive');
            }}
            className="min-h-11"
          >
            <Archive className="w-4 h-4 mr-2" />
            Архив
          </Button>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">v{draftVersion}</p>
    </div>
  );
}
