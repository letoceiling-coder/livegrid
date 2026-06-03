import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiDownloadBlob, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  apiPath: string;
  filename: string;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost';
  label?: string;
};

export default function DownloadPdfButton({
  apiPath,
  filename,
  className,
  size = 'sm',
  variant = 'outline',
  label = 'Скачать PDF',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiDownloadBlob(apiPath, filename);
    } catch (e) {
      setError(e instanceof ApiError ? 'Не удалось скачать PDF' : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('inline-flex flex-col items-start gap-1', className)}>
      <Button type="button" variant={variant} size={size} disabled={loading} onClick={() => void handleClick()}>
        <Download className="w-4 h-4 mr-2" />
        {loading ? 'Загрузка…' : label}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
