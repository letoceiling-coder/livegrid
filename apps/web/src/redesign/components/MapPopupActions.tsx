import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ConversionCTABar from '@/redesign/components/ConversionCTABar';
import { CONVERSION_CTA, type ConsultationContext } from '@/redesign/lib/conversion-cta';

type Props = {
  detailsHref: string;
  consultationContext: ConsultationContext;
  onConsultation: (ctx: ConsultationContext) => void;
  detailsLabel?: string;
};

/** Shared map popup actions — listing + complex popups. */
const MapPopupActions = ({
  detailsHref,
  consultationContext,
  onConsultation,
  detailsLabel = CONVERSION_CTA.details,
}: Props) => (
  <div className="space-y-2">
    <Button asChild size="sm" variant="outline" className="w-full h-9">
      <Link to={detailsHref}>{detailsLabel}</Link>
    </Button>
    <ConversionCTABar
      context={consultationContext}
      size="sm"
      layout="stack"
      consultationLabel={CONVERSION_CTA.consultation}
      onConsultation={onConsultation}
    />
  </div>
);

export default MapPopupActions;
