import { useEffect, useState } from 'react';
import LeadForm from '@/shared/components/LeadForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  consultationTitle,
  type ConsultationContext,
} from '@/redesign/lib/conversion-cta';
import { conversionObsConsultationOpen } from '@/redesign/lib/conversion-observability';
import { prefersReducedMotion } from '@/redesign/lib/map-sidebar-scroll-utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ConsultationContext | null;
};

function useMobileConversion(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const fn = () => setMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return mobile;
}

const ConsultationFlow = ({ open, onOpenChange, context }: Props) => {
  const isMobile = useMobileConversion();
  const title = context ? consultationTitle(context) : '';

  useEffect(() => {
    if (open && context) {
      const t0 = performance.now();
      requestAnimationFrame(() => {
        conversionObsConsultationOpen(context.surface, t0);
      });
    }
  }, [open, context]);

  if (!context) return null;

  const form = (
    <LeadForm
      embedded
      title=""
      source={context.source}
      requestType={context.requestType ?? (context.sold ? 'CONSULTATION' : 'CONSULTATION')}
      blockId={context.blockId}
      listingId={context.listingId}
      contextFooter={context.contextFooter}
      onSuccess={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto safe-area-pb"
        >
          <SheetHeader>
            <SheetTitle className="text-left text-base">{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={prefersReducedMotion() ? { animation: 'none' } : undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationFlow;
