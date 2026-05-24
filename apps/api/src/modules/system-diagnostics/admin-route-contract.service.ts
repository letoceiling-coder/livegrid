import { Injectable } from '@nestjs/common';
import { ADMIN_ROUTE_MANIFEST, REQUIRED_APP_MODULES } from './admin-route-manifest';

/** Static contract report — modules registered in app.module (Iter 82). */
@Injectable()
export class AdminRouteContractService {
  getContract() {
    const registeredModules = [...REQUIRED_APP_MODULES];
    const routes = ADMIN_ROUTE_MANIFEST.map((r) => ({
      ...r,
      expectedRegistered: registeredModules.includes(r.module as (typeof REQUIRED_APP_MODULES)[number]),
    }));

    const byModule = new Map<string, typeof routes>();
    for (const r of routes) {
      const list = byModule.get(r.module) ?? [];
      list.push(r);
      byModule.set(r.module, list);
    }

    return {
      refreshedAt: new Date().toISOString(),
      noteRu:
        'Runtime smoke: use scripts/verify-admin-routes.mjs with valid JWT. This endpoint documents expected contract after app.module registration.',
      registeredModules,
      routes,
      modules: [...byModule.entries()].map(([module, moduleRoutes]) => ({
        module,
        routeCount: moduleRoutes.length,
        paths: moduleRoutes.map((x) => `${x.method} ${x.path}`),
      })),
      missingRouteReport: routes
        .filter((r) => !r.expectedRegistered)
        .map((r) => `${r.method} ${r.path} (${r.module})`),
    };
  }
}
