/**
 * Safe React.lazy wrapper with chunk-reload + import failure diagnostics (Iter 61).
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const EXPORT_MISMATCH_RE = /does not provide an export named|Export .* was not found/;

export type LazyImportFailure = {
  routeId: string;
  message: string;
  at: string;
  kind: 'chunk' | 'export' | 'unknown';
};

const failures: LazyImportFailure[] = [];

export function getLazyImportFailures(): readonly LazyImportFailure[] {
  return failures;
}

export function clearLazyImportFailures(): void {
  failures.length = 0;
}

const CHUNK_RE =
  /Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/;

export function lazyWithReload<T extends ComponentType<unknown>>(
  routeIdOrFactory: string | (() => Promise<{ default: T }>),
  maybeFactory?: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  const routeId = typeof routeIdOrFactory === 'string' ? routeIdOrFactory : 'anonymous';
  const factory =
    typeof routeIdOrFactory === 'string' ? (maybeFactory as () => Promise<{ default: T }>) : routeIdOrFactory;
  return lazy(() =>
    factory()
      .then((mod) => {
        if (mod?.default == null) {
          const msg = `Module ${routeId} loaded but default export is missing`;
          failures.push({ routeId, message: msg, at: new Date().toISOString(), kind: 'export' });
          throw new Error(msg);
        }
        return mod;
      })
      .catch((err: unknown) => {
      const msg = (err as Error)?.message ?? String(err);
      const kind = EXPORT_MISMATCH_RE.test(msg) ? 'export' : CHUNK_RE.test(msg) ? 'chunk' : 'unknown';
      failures.push({ routeId, message: msg, at: new Date().toISOString(), kind });

      const isChunk =
        (err as Error)?.name === 'ChunkLoadError' || kind === 'chunk';
      if (isChunk && sessionStorage.getItem('chunk_reload') !== '1') {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}

export function lazyRoute<T extends ComponentType<unknown>>(
  routeId: string,
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazyWithReload(routeId, factory);
}
