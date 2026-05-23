import { toast } from '@/components/ui/sonner';
import { conversionObsShare } from '@/redesign/lib/conversion-observability';

/** Web Share API или копирование ссылки в буфер. */
export async function shareCurrentPage(opts?: { title?: string }) {
  conversionObsShare();
  const url = window.location.href;
  const title = opts?.title?.trim() || document.title;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, url });
      return;
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Ссылка скопирована');
  } catch {
    toast.error('Не удалось скопировать ссылку');
  }
}
