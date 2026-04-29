import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/shared/config/api';

type LeadRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: string;
  objectName?: string;
  objectUrl?: string;
  blockId?: string;
};

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^8/, '7').replace(/^9/, '79').slice(0, 11);
  if (!digits) return '+7';
  const core = digits.startsWith('7') ? digits.slice(1) : digits;
  const p1 = core.slice(0, 3);
  const p2 = core.slice(3, 6);
  const p3 = core.slice(6, 8);
  const p4 = core.slice(8, 10);
  let out = '+7';
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ')';
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export default function LeadRequestDialog({
  open,
  onOpenChange,
  kind = 'Записаться на просмотр',
  objectName,
  objectUrl,
  blockId,
}: LeadRequestDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind}</DialogTitle>
          <DialogDescription>
            Оставьте контакт, менеджер свяжется с вами в ближайшее время.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            disabled={submitting}
          />
          <Input
            value={phone}
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            placeholder="+7 (900) 000-00-00"
            disabled={submitting}
          />
          <div className="flex items-center gap-2">
            <Button
              disabled={submitting}
              onClick={async () => {
                setMessage('');
                const cleanName = name.trim();
                const digits = phone.replace(/\D/g, '');
                if (cleanName.length < 2) {
                  setMessage('Укажите имя');
                  return;
                }
                if (digits.length < 11) {
                  setMessage('Укажите корректный телефон');
                  return;
                }

                setSubmitting(true);
                try {
                  const response = await fetch(getApiUrl('requests'), {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                      name: cleanName,
                      phone,
                      kind,
                      objectName,
                      objectUrl,
                      blockId,
                    }),
                  });
                  if (!response.ok) {
                    throw new Error('Ошибка отправки заявки');
                  }
                  setMessage('Заявка отправлена');
                  setName('');
                  setPhone('+7');
                  setTimeout(() => onOpenChange(false), 700);
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : 'Ошибка отправки заявки');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </Button>
            {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
