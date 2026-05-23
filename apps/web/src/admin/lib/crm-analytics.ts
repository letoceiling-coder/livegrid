/** CRM analytics labels — derived metrics only (Iter 35). */

export const FUNNEL_STAGE_LABEL: Record<string, string> = {
  NEW: 'Новые',
  IN_PROGRESS: 'В работе',
  CONTACTED: 'Связались',
  VIEWING_SCHEDULED: 'Просмотр',
  NEGOTIATION: 'Переговоры',
  SUCCESS: 'Успех',
  CLOSED: 'Закрыты',
  SPAM: 'Спам',
};

export const HEALTH_HOTSPOT_LABEL: Record<string, string> = {
  stable: 'Стабильно',
  overdue_elevated: 'Рост просрочек',
  unassigned_pressure: 'Давление очереди без менеджера',
  inflow_spike: 'Скачок входящих',
};

export const QUALITY_SIGNAL_LABEL: Record<string, string> = {
  green: 'Норма',
  yellow: 'Внимание',
  red: 'Риск',
};

export type TimelineHint = {
  code: string;
  severity: 'green' | 'yellow' | 'red';
  message: string;
};

export const TREND_DIRECTION_LABEL: Record<string, string> = {
  improving: 'Улучшение',
  degrading: 'Ухудшение',
  stable: 'Стабильно',
};

export type TrendDirection = 'improving' | 'degrading' | 'stable';

export type CrmHistoryResponse = {
  periodDays: number;
  snapshotCount: number;
  series: Array<{
    metric: string;
    label: string;
    points: Array<{ date: string; value: number }>;
    direction: TrendDirection;
    deltaPct: number | null;
    lowerIsBetter: boolean;
  }>;
  driftWarnings: string[];
  managerHistory: Array<{
    assigneeId: string;
    assigneeName: string;
    points: Array<{
      date: string;
      overduePct: number;
      abandonedPct: number;
      noteCoveragePct: number;
      reassignmentPct: number;
      avgFirstTouchMinutes: number | null;
    }>;
    overdueDirection: TrendDirection;
    abandonmentDirection: TrendDirection;
  }>;
  sourceTrends?: Array<{
    metric: string;
    label: string;
    points: Array<{ date: string; value: number }>;
    direction: TrendDirection;
    deltaPct: number | null;
    lowerIsBetter: boolean;
  }>;
  lifecycleTrends?: Array<{
    metric: string;
    label: string;
    points: Array<{ date: string; value: number }>;
    direction: TrendDirection;
    deltaPct: number | null;
    lowerIsBetter: boolean;
  }>;
  qualityTrends?: Array<{
    metric: string;
    label: string;
    points: Array<{ date: string; value: number }>;
    direction: TrendDirection;
    deltaPct: number | null;
    lowerIsBetter: boolean;
  }>;
  forecastTrends?: Array<{
    metric: string;
    label: string;
    points: Array<{ date: string; value: number }>;
    direction: TrendDirection;
    deltaPct: number | null;
    lowerIsBetter: boolean;
  }>;
  queryMs?: number;
};

export type CrmAnalyticsResponse = {
  refreshedAt: string;
  periodDays: number;
  cached?: boolean;
  computeMs?: number;
  limits?: { maxOpenScan: number; cacheMs: number; maxTimelineSample?: number };
  funnel: Array<{
    stage: string;
    count: number;
    dropoffPct: number | null;
    shareOfPipelinePct: number | null;
  }>;
  inflow: {
    byDay: Array<{ date: string; count: number }>;
    thisWeek: number;
    prevWeek: number;
    deltaPct: number | null;
  };
  outcomes: { byDay: Array<{ date: string; count: number }> };
  sla: {
    openCount: number;
    overdue: number;
    stale: number;
    avgInactivityHours: number;
    unassignedPressurePct: number;
    scannedCap: boolean;
  };
  slaTrend: {
    overdueNow: number;
    staleNow: number;
    inflowDeltaPct: number | null;
    recoveryProxy: number;
  };
  aging: Array<{ status: string; avgInactivityHours: number; count: number }>;
  latency: {
    sampleSize: number;
    assignmentLatencyMinutes: number | null;
    firstContactLatencyMinutes: number | null;
  };
  managers: Array<{
    assigneeId: string;
    assigneeName: string;
    assigned: number;
    overdue: number;
    stale: number;
    overduePct: number;
    completedInPeriod: number;
  }>;
  health: {
    reopenCount: number;
    bottlenecks: Array<{ stage: string; count: number; avgInactivityHours: number }>;
    queuePressure: number;
    conversionToSuccess: number;
    hotspot: string;
  };
  timeline?: {
    computeMs?: number;
    behavior: {
      sampleSize: number;
      medianTouchesBeforeSuccess: number | null;
      avgTransitionsPerLead: number;
      noteDisciplinePct: number;
      assignmentChurnPct: number;
      untouchedLeadPct: number;
      reopenAfterTerminalPct: number;
      medianInactivityGapHours: number | null;
    };
    managerPerformance: Array<{
      assigneeId: string;
      assigneeName: string;
      assignedOpen: number;
      avgFirstTouchMinutes: number | null;
      avgInactivityGapHours: number | null;
      noteCoveragePct: number;
      reassignmentPct: number;
      reopenAfterContactPct: number;
      abandonedPct: number;
      touchesPerLead: number;
      qualitySignal: 'green' | 'yellow' | 'red';
    }>;
    agingHotspots: Array<{
      code: string;
      label: string;
      count: number;
      avgInactivityHours: number;
      severity: 'green' | 'yellow' | 'red';
    }>;
    hygiene: {
      qualityGreen: number;
      qualityYellow: number;
      qualityRed: number;
      reopenHeat: 'green' | 'yellow' | 'red';
      topAlerts: string[];
    };
  };
  history?: CrmHistoryResponse & { sourceTrends?: CrmHistoryResponse['sourceTrends'] };
  attribution?: {
    periodDays: number;
    scanned: number;
    cached?: boolean;
    computeMs?: number;
    managerScoped?: boolean;
    bySource: Array<{
      sourceType: string;
      label: string;
      inflow: number;
      open: number;
      overdue: number;
      stale: number;
      success: number;
      spam: number;
      overduePct: number;
      successPct: number;
      reopenCount: number;
    }>;
    objectPressure: Array<{
      objectKind: 'block' | 'listing';
      objectId: number;
      objectName: string;
      inflow: number;
      open: number;
      overdue: number;
      stale: number;
      pressureScore: number;
      reopenCount: number;
    }>;
    bottlenecks: string[];
    qualityHotspot: string;
  };
  pipeline?: {
    periodDays: number;
    sampleSize: number;
    cached?: boolean;
    computeMs?: number;
    avgLifecycleHours: number | null;
    transitionLatencies: Array<{
      from: string;
      to: string;
      label: string;
      medianHours: number | null;
      sampleSize: number;
    }>;
    stageAging: Array<{
      stage: string;
      label: string;
      count: number;
      medianHoursInStage: number;
    }>;
    friction: Array<{
      code: string;
      label: string;
      count: number;
      severity: 'green' | 'yellow' | 'red';
    }>;
    successPath: {
      count: number;
      medianLifecycleDays: number | null;
      medianTouches: number | null;
      medianTransitions: number | null;
    };
  };
  conversionQuality?: {
    periodDays: number;
    sampleSize: number;
    cached?: boolean;
    computeMs?: number;
    managerScoped?: boolean;
    metrics: {
      successStabilityPct: number;
      reopenAfterSuccessPct: number;
      negotiationCompletionPct: number;
      fastSpamPct: number;
      healthyLifecyclePct: number;
      recoverySuccessPct: number;
      weakSuccessPct: number;
      fakeProgressionPct: number;
    };
    warnings: Array<{ code: string; label: string; severity: 'green' | 'yellow' | 'red' }>;
    managerRecovery: Array<{
      assigneeId: string;
      assigneeName: string;
      recovered: number;
      staleRecoveries: number;
      reopenRecoveries: number;
      negotiationRecoveries: number;
      strongSuccess: number;
    }>;
    sourceQuality: Array<{
      sourceType: string;
      label: string;
      inflow: number;
      strongSuccess: number;
      unstableSuccess: number;
      fastSpam: number;
      qualityScore: number;
    }>;
  };
  operationalForecast?: {
    confidence: 'low' | 'medium' | 'high';
    readinessScore: number;
    cached?: boolean;
    computeMs?: number;
    managerScoped?: boolean;
    slaForecast: {
      overdueNow: number;
      staleNow: number;
      overdueProjected24h: number;
      staleProjected48h: number;
      confidence: 'low' | 'medium' | 'high';
    };
    riskSignals: Array<{
      code: string;
      severity: 'green' | 'yellow' | 'red';
      label: string;
      horizon: '24h' | '48h' | '7d';
      confidence: 'low' | 'medium' | 'high';
      projectedValue?: number;
    }>;
    capacityPressure: Array<{
      assigneeId: string;
      assigneeName: string;
      assignedOpen: number;
      overduePct: number;
      saturationScore: number;
      risk: 'green' | 'yellow' | 'red';
    }>;
    pipelineDecay: Array<{
      code: string;
      label: string;
      severity: 'green' | 'yellow' | 'red';
      accelerationPct: number | null;
    }>;
    driftForecasts: string[];
  };
};
