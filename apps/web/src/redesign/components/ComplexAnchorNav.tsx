import { cn } from '@/lib/utils';

export type ComplexSection = {
  id: string;
  label: string;
};

type Props = {
  sections: ComplexSection[];
  activeId: string;
  onNavigate: (id: string) => void;
};

const ComplexAnchorNav = ({ sections, activeId, onNavigate }: Props) => {
  if (sections.length === 0) return null;

  return (
    <nav
      className="sticky top-16 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border mb-6"
      aria-label="Разделы комплекса"
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(id);
            }}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeId === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/40 hover:bg-muted/60',
            )}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default ComplexAnchorNav;
