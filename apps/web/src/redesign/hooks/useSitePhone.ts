import { useMemo } from 'react';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { telHref } from '@/lib/contact-links';

/** Site-wide phone from CMS settings (`phone_main`). */
export function useSitePhone() {
  const { data: settings, isLoading } = useSiteSettings();
  const phone = useMemo(() => settingOptional(settings, 'phone_main'), [settings]);
  const phoneHref = useMemo(() => (phone ? telHref(phone) : undefined), [phone]);
  return {
    phone,
    phoneHref,
    isAvailable: Boolean(phone && phoneHref && phoneHref !== 'tel:'),
    isLoading,
  };
}
