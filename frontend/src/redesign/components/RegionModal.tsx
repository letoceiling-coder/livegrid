import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { RegionId, RegionOption } from '@/redesign/lib/regions';

type RegionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: RegionOption[];
  selectedId: RegionId;
  onSelect: (id: RegionId) => void;
};

export default function RegionModal({
  open,
  onOpenChange,
  regions,
  selectedId,
  onSelect,
}: RegionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Регион</DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground pt-1">
            Выберите регион поиска. Список будет расширяться.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[min(60vh,320px)] overflow-y-auto py-1 border border-border rounded-xl divide-y divide-border">
          {regions.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r.id);
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                  selectedId === r.id && 'text-primary font-medium bg-muted/30',
                )}
              >
                {selectedId === r.id && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
