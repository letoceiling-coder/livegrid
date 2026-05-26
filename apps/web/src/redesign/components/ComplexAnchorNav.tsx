import { cn } from '@/lib/utils';

export type ComplexSection = { id: string; label: string };

type Props = {
  sections: ComplexSection[];
  activeId: string;
  onNavigate: (id: string) => void;
};

const ComplexAnchorNav = ({ sections, activeId, onNavigate }: Props) => {
  if (sections.length === 0) return null;

  return (
    <nav
      className="sticky top-14 z-30 -mx-4 px-4 mb-4 border-b border-border/80 bg-background/95 backdrop-blur-md"
      aria-label="Разделы комплекса"
    >
      <div className="flex gap-0 overflow-x-auto scrollbar-hide">
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(id);
            }}
            className={cn(
              'relative shrink-0 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap',
              'text-muted-foreground hover:text-foreground',
              activeId === id && 'text-primary',
            )}
          >
            {label}
            <span
              className={cn(
                'absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary transition-transform duration-200 origin-center',
                activeId === id ? 'scale-x-100' : 'scale-x-0',
              )}
              aria-hidden
            />
          </a>
        ))}
      </div>
    </nav>
  );
};

export default ComplexAnchorNav;
