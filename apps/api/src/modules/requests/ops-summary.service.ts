import { Injectable } from '@nestjs/common';
import { CrmNotificationsService } from '../crm-notifications/crm-notifications.service';
import { RequestsService } from './requests.service';

@Injectable()
export class OpsSummaryService {
  constructor(
    private readonly requests: RequestsService,
    private readonly notifications: CrmNotificationsService,
  ) {}

  async getSummary(operatorId: string) {
    const [workload, overdueRes, staleRes, unassignedRes, unreadCount] = await Promise.all([
      this.requests.getWorkload(),
      this.requests.findAll(undefined, undefined, undefined, 1, 8, 'priority', 'overdue'),
      this.requests.findAll(undefined, undefined, undefined, 1, 8, 'priority', 'stale'),
      this.requests.findAll(undefined, 'none', undefined, 1, 8, 'priority'),
      this.notifications.getUnreadCount(operatorId),
    ]);

    const overloadManagers = workload.managers.filter(
      (m) => m.overdue >= 2 || m.assigned >= 8,
    );

    return {
      refreshedAt: new Date().toISOString(),
      totals: workload.totals,
      unassigned: workload.unassigned,
      notifications: { unread: unreadCount },
      escalation: {
        overdueCount: workload.totals.overdue,
        staleCount: workload.totals.stale,
        unassignedRisk: workload.unassigned.overdue + workload.unassigned.stale,
        overloadManagers: overloadManagers.length,
      },
      queues: {
        overdue: overdueRes.data,
        stale: staleRes.data,
        unassigned: unassignedRes.data,
      },
      managers: workload.managers.slice(0, 10),
      heat: {
        overdue: workload.totals.overdue,
        stale: workload.totals.stale,
        open: workload.totals.open,
        pressure: unreadCount,
      },
    };
  }
}
