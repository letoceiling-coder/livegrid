import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { useEntityTypes } from '../hooks/useEntityTypes';

export default function EntityHubPage() {
  const { data: types, isError, error } = useEntityTypes();

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive text-sm">
        {(error as Error).message}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
        <Database className="w-7 h-7" />
        Универсальная CRM
      </h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Интерфейс строится из{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /api/v2/entity-types</code>. Выберите тип
        сущности.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(types ?? []).map(t => (
          <Link
            key={t.code}
            to={`/crm2/entities/${t.code}`}
            className="block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">{t.code}</div>
            <div className="text-xs text-muted-foreground mt-2">{t.fields.length} полей</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
