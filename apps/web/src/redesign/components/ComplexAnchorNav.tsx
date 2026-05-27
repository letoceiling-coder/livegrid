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
      className="sticky top-14 z-30 -mx-4 px-4 mb-5 border-b border-border/60 bg-background/95 backdrop-blur-md"
      aria-label="Разделы комплекса"
    >
      <div className="flex gap-0 overflow-x-auto scrollbar-hide">
        {sections.map(({ id, label }) => {
          const active = activeId === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(id);
              }}
              className={cn(
                'relative shrink-0 px-3.5 py-3 text-xs font-medium transition-colors whitespace-nowrap select-none',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80',
              )}
            >
              {label}
              <span
                className={cn(
                  'absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary transition-all duration-200 origin-center',
                  active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0',
                )}
                aria-hidden
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default ComplexAnchorNav;
