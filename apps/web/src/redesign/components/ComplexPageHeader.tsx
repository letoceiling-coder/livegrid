import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import ObjectPageActionBar from '@/redesign/components/ObjectPageActionBar';

type Props = {
  complex: ResidentialComplex;
  actions: React.ComponentProps<typeof ObjectPageActionBar>['actions'];
  className?: string;
};

function statusBadge(status: ResidentialComplex['status']) {
  if (status === 'completed') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        Сдан
      </span>
    );
  }
  if (status === 'building') {
    return (
      <span className="inline-flex rounded-md bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
        Строится
      </span>
    );
  }
  if (status === 'planned') {
    return (
      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Планируется
      </span>
    );
  }
  return null;
}

export default function ComplexPageHeader({ complex, actions, className }: Props) {
  return (
    <header className={cn('mb-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">{statusBadge(complex.status)}</div>
          <h1 className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold tracking-tight leading-tight">{complex.name}</h1>
          {complex.deadline && complex.deadline !== '—' ? (
            <p className="text-xs text-muted-foreground mt-1">Сдача · {complex.deadline}</p>
          ) : null}
        </div>
        <ObjectPageActionBar actions={actions} />
      </div>
    </header>
  );
}
