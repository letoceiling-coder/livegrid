import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import aboutMain from '@/assets/about-main.jpg';
import {
  aboutPlatformIcon,
  aboutPlatformSectionBg,
  normalizeAboutPlatformSettings,
  sortedEnabledStats,
  type AboutPlatformSettings,
} from '@/shared/lib/about-platform-cms';
import { useAboutPlatformSection } from '@/shared/hooks/useAboutPlatformSection';

type Props = {
  pageSlug?: string;
  settings?: AboutPlatformSettings;
  preview?: boolean;
};

function CtaLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const className = cn(
    'inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'border border-border bg-background text-foreground hover:bg-muted/60',
  );
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

const AboutPlatform = ({ pageSlug = '/', settings: settingsProp, preview = false }: Props) => {
  const cms = useAboutPlatformSection(preview ? '' : pageSlug);
  if (!preview && !settingsProp && cms === null) return null;

  const settings = settingsProp ?? cms?.settings ?? normalizeAboutPlatformSettings(null);
  const stats = sortedEnabledStats(settings);
  const desktopSrc = settings.imageUrl?.trim() || aboutMain;
  const mobileSrc = settings.imageUrlMobile?.trim() || desktopSrc;

  return (
    <section
      className={cn('py-8 sm:py-10', aboutPlatformSectionBg(settings.backgroundVariant))}
      aria-labelledby="about-platform-title"
    >
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 md:items-center">
          <div className="relative mx-auto w-full max-w-[480px] md:max-w-none md:mx-0">
            <div className="relative overflow-hidden rounded-3xl aspect-[5/4] max-h-[220px] sm:max-h-[260px] md:max-h-[280px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-muted">
              <picture>
                {settings.imageUrlMobile?.trim() ? (
                  <source media="(max-width: 767px)" srcSet={mobileSrc} />
                ) : null}
                <img
                  src={desktopSrc}
                  alt={settings.imageAlt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={640}
                  height={512}
                />
              </picture>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
            {settings.eyebrow ? (
              <p className="text-xs font-medium tracking-wide text-primary/80">{settings.eyebrow}</p>
            ) : null}
            <h2 id="about-platform-title" className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
              {settings.title}
            </h2>
            {settings.description ? (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl line-clamp-3">
                {settings.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {settings.primaryButtonText?.trim() ? (
                <CtaLink href={settings.primaryButtonUrl || '/login'} variant="primary">
                  {settings.primaryButtonText}
                </CtaLink>
              ) : null}
              {settings.secondaryButtonText?.trim() ? (
                <CtaLink href={settings.secondaryButtonUrl || '/catalog'} variant="secondary">
                  {settings.secondaryButtonText}
                </CtaLink>
              ) : null}
            </div>
          </div>
        </div>

        {stats.length > 0 ? (
          <ul
            className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
            aria-label="Показатели платформы"
          >
            {stats.map((s) => {
              const Icon = aboutPlatformIcon(s.icon);
              return (
                <li
                  key={s.id}
                  className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold tabular-nums leading-none text-foreground">
                        {s.value}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">{s.label}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

export default AboutPlatform;
