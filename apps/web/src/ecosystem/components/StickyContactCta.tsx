import { Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Props = {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  listingHref?: string;
  className?: string;
};

export default function StickyContactCta({ phone, email, website, listingHref, className }: Props) {
  const tel = phone?.trim();
  const mail = email?.trim();

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
        className,
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-2">
        {tel ? (
          <a
            href={`tel:${tel}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground min-h-[44px] text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            Позвонить
          </a>
        ) : null}
        {mail ? (
          <a
            href={`mailto:${mail}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border min-h-[44px] text-sm font-medium"
          >
            <Mail className="w-4 h-4" />
            Email
          </a>
        ) : null}
        {!tel && !mail && website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground min-h-[44px] text-sm font-medium"
          >
            Сайт
          </a>
        ) : null}
        {listingHref ? (
          <Link
            to={listingHref}
            className="hidden sm:inline-flex items-center justify-center rounded-xl border px-4 min-h-[44px] text-sm font-medium"
          >
            Объявления
          </Link>
        ) : null}
      </div>
    </div>
  );
}
