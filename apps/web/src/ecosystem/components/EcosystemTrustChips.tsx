import { ShieldCheck, Clock, BarChart3, Home } from 'lucide-react';
import { RESPONSE_RELIABILITY_LABEL, type PublicTrustIndicators } from '@lg/shared';
import { cn } from '@/lib/utils';

export default function EcosystemTrustChips({
  trust,
  className,
}: {
  trust: PublicTrustIndicators;
  className?: string;
}) {
  const chips: Array<{ key: string; label: string; icon: typeof ShieldCheck }> = [];

  if (trust.agencyVerified) {
    chips.push({ key: 'verified', label: 'Проверенное агентство', icon: ShieldCheck });
  }
  if (trust.agentTrustScore != null && trust.agentTrustScore >= 75) {
    chips.push({ key: 'trusted', label: `Trust ${trust.agentTrustScore}`, icon: ShieldCheck });
  }
  if (trust.avgListingQuality != null && trust.avgListingQuality >= 70) {
    chips.push({ key: 'quality', label: `Качество ${trust.avgListingQuality}`, icon: BarChart3 });
  }
  if (trust.responseReliability) {
    chips.push({
      key: 'response',
      label: RESPONSE_RELIABILITY_LABEL[trust.responseReliability],
      icon: Clock,
    });
  }
  if (trust.listingCount > 0) {
    chips.push({ key: 'listings', label: `${trust.listingCount} объявлений`, icon: Home });
  }

  if (!chips.length) return null;

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-1 px-1', className)}>
      {chips.map((c) => (
        <span
          key={c.key}
          className="shrink-0 inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium"
        >
          <c.icon className="w-3 h-3 text-primary" aria-hidden />
          {c.label}
        </span>
      ))}
    </div>
  );
}
