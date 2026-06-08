/** Yield to the Node event loop so HTTP handlers stay responsive during long jobs. */
export function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
