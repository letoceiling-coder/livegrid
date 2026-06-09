import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Car,
  Home,
  Loader2,
  Save,
  Store,
  Trash2,
  TreePine,
  Trees,
} from 'lucide-react';
import type { WizardDraftResponse } from '@lg/shared';
import {
  formatApiValidationError,
  parseApiValidationErrors,
  wizardStepFromValidationFields,
  WIZARD_STEP_TITLES,
  validateWizardDraft,
  validateWizardStep,
} from '@lg/shared';
import { apiGet, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { useWizardAutosave } from '@/admin/hooks/useWizardAutosave';
import SellerFields from '@/admin/components/SellerFields';
import { listingWizardKindLabels, type ListingWizardKind } from '@/admin/lib/listingWizardConfig';
import {
  applyKindDefaults,
  clearWizardDraft,
  loadWizardDraft,
  makeEmptyWizardDraft,
  saveWizardDraft,
  toValidationSlice,
  type ListingWizardDraft,
} from '@/admin/lib/listingWizardDraft';
import { mergeHydratedDraft } from '@/admin/lib/listingWizardMerge';
import { submitWizardListing } from '@/admin/lib/listingWizardSubmit';
import AddressGeocoderField from '@/admin/components/listing-wizard/AddressGeocoderField';
import ListingWizardDynamicFields from '@/admin/components/listing-wizard/ListingWizardDynamicFields';
import ListingWizardMediaStep from '@/admin/components/listing-wizard/ListingWizardMediaStep';
import ListingWizardAgentStep from '@/admin/components/listing-wizard/ListingWizardAgentStep';
import ListingWizardPreviewCard from '@/admin/components/listing-wizard/ListingWizardPreviewCard';
import ListingWizardFooter from '@/admin/components/listing-wizard/ListingWizardFooter';

type RegionRow = { id: number; code: string; name: string };
type BlockRow = { id: number; name: string };
type RefOpt = { id: number; name: string };
type AgentRow = { id: string; fullName: string | null; email: string | null };

const KIND_OPTIONS: Array<{
  kind: ListingWizardKind;
  title: string;
  hint: string;
  icon: typeof Home;
}> = [
  { kind: 'APARTMENT', ...listingWizardKindLabels.APARTMENT, icon: Building2 },
  { kind: 'ROOM', ...listingWizardKindLabels.ROOM, icon: BedDouble },
  { kind: 'HOUSE', ...listingWizardKindLabels.HOUSE, icon: Home },
  { kind: 'DACHA', ...listingWizardKindLabels.DACHA, icon: Trees },
  { kind: 'LAND', ...listingWizardKindLabels.LAND, icon: TreePine },
  { kind: 'COMMERCIAL', ...listingWizardKindLabels.COMMERCIAL, icon: Store },
  { kind: 'PARKING', ...listingWizardKindLabels.PARKING, icon: Car },
];

const WIZARD_KIND_PARAM = new Set<ListingWizardKind>([
  'APARTMENT', 'ROOM', 'HOUSE', 'DACHA', 'LAND', 'COMMERCIAL', 'PARKING',
]);

export default function AdminListingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { listingId } = useParams<{ listingId?: string }>();
  const resumeId = listingId ? Number(listingId) : null;
  const editMode = resumeId != null && Number.isFinite(resumeId);
  const presetKindRaw = searchParams.get('kind')?.toUpperCase() ?? '';
  const presetKind = WIZARD_KIND_PARAM.has(presetKindRaw as ListingWizardKind)
    ? (presetKindRaw as ListingWizardKind)
    : null;
  const { user } = useAuth();
  const qc = useQueryClient();
  const hydratedRef = useRef(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingWizardDraft>(() => {
    const d = loadWizardDraft();
    if (user?.id && !d.ownerUserId) d.ownerUserId = user.id;
    return d;
  });
  const [submitError, setSubmitError] = useState('');
  const [savedNote, setSavedNote] = useState(false);
  const [restoredNote, setRestoredNote] = useState(false);

  const patchDraft = useCallback((patch: Partial<ListingWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch, isDirty: patch.isDirty ?? true }));
  }, []);

  useEffect(() => {
    saveWizardDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (editMode || !presetKind) return;
    setDraft((prev) => {
      if (prev.kind || prev.serverListingId) return prev;
      return applyKindDefaults({ ...prev, kind: presetKind, isDirty: false });
    });
  }, [editMode, presetKind]);

  const { data: moderationConfig } = useQuery({
    queryKey: ['wizard', 'moderation-config'],
    queryFn: () => apiGet<{ enabled: boolean }>('/admin/listings/wizard/moderation-config'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: serverDraft, isLoading: loadingServer } = useQuery({
    queryKey: ['wizard', 'draft', resumeId],
    queryFn: () => apiGet<WizardDraftResponse>(`/admin/listings/wizard/${resumeId}/draft`),
    enabled: editMode,
    staleTime: 0,
  });

  useEffect(() => {
    if (!serverDraft || hydratedRef.current) return;
    hydratedRef.current = true;
    const merged = mergeHydratedDraft(serverDraft, loadWizardDraft());
    setDraft(merged);
    setStep(merged.currentStep ?? 0);
    setRestoredNote(true);
    toast.message('Черновик восстановлен с сервера');
  }, [serverDraft]);

  const onPatched = useCallback((patch: Partial<ListingWizardDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const onConflict = useCallback((currentVersion: number) => {
    toast.error('Черновик изменён в другой вкладке. Обновите страницу.');
    patchDraft({ serverVersion: currentVersion });
  }, [patchDraft]);

  const { ensureServerDraft, flushSave } = useWizardAutosave({
    draft,
    step,
    enabled: !loadingServer,
    onPatched,
    onConflict,
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draft.isDirty]);

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const { data: blocksForRegion } = useQuery({
    queryKey: ['wizard', 'blocks', draft.regionId],
    queryFn: () =>
      apiGet<{ data: BlockRow[] }>(
        `/blocks?region_id=${draft.regionId}&per_page=200&page=1&sort=name_asc`,
      ),
    enabled: draft.regionId != null,
    staleTime: 5 * 60 * 1000,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ['reference', 'room-types'],
    queryFn: () => apiGet<RefOpt[]>('/reference/room-types'),
    staleTime: 60 * 60 * 1000,
  });

  const { data: finishings } = useQuery({
    queryKey: ['reference', 'finishings'],
    queryFn: () => apiGet<RefOpt[]>('/reference/finishings'),
    staleTime: 60 * 60 * 1000,
  });

  const { data: agents } = useQuery({
    queryKey: ['admin', 'listings', 'agents'],
    queryFn: () => apiGet<AgentRow[]>('/admin/listings/agents'),
    staleTime: 5 * 60 * 1000,
  });

  const stepValid = useMemo(
    () => validateWizardStep(toValidationSlice(draft), step),
    [step, draft],
  );

  const stepBadge = useCallback(
    (i: number) => {
      const v = validateWizardStep(toValidationSlice(draft), i);
      if (i === step) return 'current';
      if (v.ok) return i < step ? 'done' : 'todo';
      return 'invalid';
    },
    [draft, step],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (draft.isDirty && draft.serverListingId) await flushSave();
      return submitWizardListing(draft);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'my-listings'] });
      clearWizardDraft();
      navigate('/admin/my-listings');
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        const fieldErrors = parseApiValidationErrors(e.message);
        const stepHint = wizardStepFromValidationFields(fieldErrors);
        if (stepHint != null) setStep(stepHint);
        setSubmitError(formatApiValidationError(e.message, e.status));
        return;
      }
      setSubmitError(e instanceof Error ? e.message : 'Ошибка сохранения');
    },
  });

  const goNext = async () => {
    if (!stepValid.ok) {
      setSubmitError(stepValid.reason ?? '');
      return;
    }
    setSubmitError('');

    if (step === 0 && draft.regionId && draft.kind && !draft.serverListingId) {
      await ensureServerDraft(draft.regionId, draft.kind);
    }
    if (step === 1 && draft.regionId && draft.kind && !draft.serverListingId) {
      await ensureServerDraft(draft.regionId, draft.kind);
    }

    setStep((s) => Math.min(WIZARD_STEP_TITLES.length - 1, s + 1));
  };

  const goPrev = () => {
    setSubmitError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const onSaveDraftLocally = () => {
    saveWizardDraft(draft);
    setSavedNote(true);
    window.setTimeout(() => setSavedNote(false), 1800);
  };

  const onResetDraft = () => {
    if (!confirm('Сбросить черновик и начать заново?')) return;
    clearWizardDraft();
    const fresh = makeEmptyWizardDraft();
    if (user?.id) fresh.ownerUserId = user.id;
    setDraft(fresh);
    setStep(0);
    setSubmitError('');
    if (!editMode) navigate('/admin/listings/wizard/new');
  };

  const onSubmit = () => {
    const validation = validateWizardDraft(toValidationSlice(draft));
    if (!validation.ok) {
      setStep(validation.step ?? 0);
      setSubmitError(validation.reason ?? 'Проверьте обязательные поля');
      return;
    }
    setSubmitError('');
    saveMutation.mutate();
  };

  if (editMode && loadingServer) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl pb-28">
      <div className="flex items-center gap-3 mb-6">
        <Button type="button" variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/admin/my-listings" aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {editMode ? `Редактирование #${resumeId}` : 'Мастер добавления объекта'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Шаг {step + 1} из {WIZARD_STEP_TITLES.length}: {WIZARD_STEP_TITLES[step]}
            {draft.serverListingId ? ` · ID ${draft.serverListingId}` : null}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onSaveDraftLocally} className="hidden sm:inline-flex shrink-0">
          <Save className="w-4 h-4 mr-2" />
          Локально
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onResetDraft} title="Сбросить черновик">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        {WIZARD_STEP_TITLES.map((t, i) => {
          const badge = stepBadge(i);
          return (
            <li
              key={t}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-[11px] sm:text-xs ${
                badge === 'current'
                  ? 'border-primary bg-primary/5 text-primary'
                  : badge === 'done'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : badge === 'invalid'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-border bg-background text-muted-foreground'
              }`}
            >
              <span className="inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
                {i + 1}
              </span>
              <span className="truncate">{t}</span>
            </li>
          );
        })}
      </ol>

      <div className="space-y-4 bg-background border rounded-2xl p-4 sm:p-6">
        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        {restoredNote ? (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 inline-block">
            Черновик загружен с сервера
          </p>
        ) : null}
        {savedNote ? (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 inline-block">
            Сохранено локально (кэш)
          </p>
        ) : null}
        {draft.hasPendingRevision ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Есть неопубликованные правки — публичная карточка не изменится до публикации или одобрения.
          </p>
        ) : null}
        {draft.moderationNote ? (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            Причина отклонения: {draft.moderationNote}
          </p>
        ) : null}

        {step === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Выберите тип объекта недвижимости.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {KIND_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = draft.kind === opt.kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...applyKindDefaults(prev, opt.kind), isDirty: true }))}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition min-h-[88px] ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-sm">{opt.title}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Город / регион *</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-11"
                value={draft.regionId ?? ''}
                onChange={(e) =>
                  patchDraft({ regionId: e.target.value ? Number(e.target.value) : null, blockId: '' })
                }
              >
                <option value="">— выберите —</option>
                {(regions ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>ЖК (необязательно)</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-11 disabled:opacity-60"
                value={draft.blockId}
                onChange={(e) => patchDraft({ blockId: e.target.value })}
                disabled={!draft.regionId}
              >
                <option value="">— без привязки —</option>
                {(blocksForRegion?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (#{b.id})
                  </option>
                ))}
              </select>
            </div>
            <AddressGeocoderField
              address={draft.address}
              lat={draft.lat}
              lng={draft.lng}
              onAddressChange={(address) => patchDraft({ address })}
              onCoordsChange={(lat, lng) => patchDraft({ lat, lng })}
            />
            <div className="space-y-1">
              <Label>Цена, ₽ *</Label>
              <Input
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => patchDraft({ price: e.target.value })}
                placeholder="12500000"
                className="min-h-11"
              />
            </div>
            <SellerFields value={draft.seller} onChange={(seller) => patchDraft({ seller })} />
          </div>
        ) : null}

        {step === 2 && draft.kind ? (
          <div className="space-y-6">
            <ListingWizardDynamicFields
              kind={draft.kind}
              draft={draft}
              onChange={patchDraft}
              roomTypes={roomTypes ?? []}
              finishings={finishings ?? []}
            />
            <ListingWizardMediaStep draft={draft} onChange={patchDraft} />
          </div>
        ) : null}

        {step === 3 ? (
          <ListingWizardAgentStep draft={draft} agents={agents ?? []} onChange={patchDraft} />
        ) : null}

        {step === 4 ? (
          <ListingWizardPreviewCard
            draft={draft}
            regions={regions ?? []}
            blocks={blocksForRegion?.data ?? []}
            roomTypes={roomTypes ?? []}
          />
        ) : null}
      </div>

      <ListingWizardFooter
        step={step}
        stepCount={WIZARD_STEP_TITLES.length}
        canGoNext={stepValid.ok}
        saving={saveMutation.isPending}
        autosaveStatus={draft.autosaveStatus}
        visibility={draft.visibility}
        moderationNote={draft.moderationNote}
        hasPendingRevision={draft.hasPendingRevision}
        moderationEnabled={moderationConfig?.enabled ?? false}
        isAgent={user?.role === 'agent'}
        onPrev={goPrev}
        onNext={() => void goNext()}
        onSaveLocal={onSaveDraftLocally}
        publishAction={draft.publishAction}
        onPublishAction={(publishAction) => patchDraft({ publishAction })}
        onSubmit={onSubmit}
      />

      {saveMutation.isPending ? (
        <div className="fixed inset-0 bg-background/40 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}


