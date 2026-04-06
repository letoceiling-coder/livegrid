import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type RegionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function RegionModal({ open, onOpenChange }: RegionModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Белгород</DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground pt-1">
            Подборка новостроек и квартир в Белгороде и области. Перейдите в раздел, чтобы смотреть
            объекты и фильтры для этого региона.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button
            type="button"
            className="bg-[#F97316] hover:bg-[#EA580C]"
            onClick={() => {
              onOpenChange(false);
              navigate('/belgorod');
            }}
          >
            Перейти в Белгород
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
