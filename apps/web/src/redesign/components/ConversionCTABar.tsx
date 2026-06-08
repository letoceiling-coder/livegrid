import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePhoneAction } from '@/redesign/hooks/usePhoneAction';
import {
  CONVERSION_CTA,
  CONVERSION_CTA_ICON,
  type ConsultationContext,
} from '@/redesign/lib/conversion-cta';
import { conversionObsCtaClick } from '@/redesign/lib/conversion-observability';

type Props = {
  context: ConsultationContext;
  disabled?: boolean;
  className?: string;
  layout?: 'row' | 'stack';
  size?: 'default' | 'sm';
  /** Primary consultation label override */
  consultationLabel?: string;
  /** Show phone button (default true) */
  showPhone?: boolean;
  onConsultation: (ctx: ConsultationContext) => void;
};

const ConversionCTABar = ({
  context,
  disabled = false,
  className,
  layout = 'row',
  size = 'default',
  consultationLabel,
  showPhone = true,
  onConsultation,
}: Props) => {
  const { handlePhoneClick, isAvailable } = usePhoneAction();
  const PhoneIcon = CONVERSION_CTA_ICON.phone;
  const ConsultIcon = CONVERSION_CTA_ICON.consultation;

  const btnH = size === 'sm' ? 'h-9' : 'h-11';
  const consultLabel =
    consultationLabel ??
    (context.requestType === 'CALLBACK'
      ? CONVERSION_CTA.callback
      : context.sold
        ? CONVERSION_CTA.consultation
        : CONVERSION_CTA.viewing);

  const openConsult = (ctx: ConsultationContext) => {
    conversionObsCtaClick('consultation', ctx.surface);
    onConsultation(ctx);
  };

  return (
    <div
      className={cn(
        'flex gap-2',
        layout === 'stack' ? 'flex-col' : 'flex-col sm:flex-row',
        className,
      )}
    >
      {showPhone ? (
        <Button
          type="button"
          variant="primary"
          className={cn('flex-1', btnH)}
          disabled={disabled || context.sold}
          onClick={() =>
            handlePhoneClick({
              context,
              onFallbackConsultation: (fallbackCtx) => onConsultation(fallbackCtx),
            })
          }
          title={!isAvailable ? 'Телефон недоступен — откроется форма обратного звонка' : undefined}
        >
          <PhoneIcon className="w-4 h-4 mr-2 shrink-0" />
          {CONVERSION_CTA.phone}
        </Button>
      ) : null}
      <Button
        type="button"
        variant={showPhone ? 'secondary' : 'primary'}
        className={cn('flex-1', btnH)}
        disabled={disabled}
        onClick={() => openConsult(context)}
      >
        <ConsultIcon className="w-4 h-4 mr-2 shrink-0" />
        {consultLabel}
      </Button>
    </div>
  );
};

export default ConversionCTABar;
