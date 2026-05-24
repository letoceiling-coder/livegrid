# 05 — Memory + Performance

## Observability

- `useCrmRuntimeMetrics` — cache entries, observers, heap estimate
- `reliability-tracker.ts` — failed requests, retries, polling pressure
- Extended `?crm_debug=1` — reliability fail/retry/poll pressure lines

## Existing Unit Coverage

- `map-stress-metrics.test.ts`
- `viewport-shadow-parity.test.ts`

## Soak Heap Guard

Mini-soak E2E asserts heap growth bound when Chrome exposes `performance.memory`.
