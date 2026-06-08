/** MTProto client for one-shot import — no background update loop (prevents API hangs). */
export function createTelegramClientOptions(connectionRetries = 3) {
  return {
    connectionRetries,
    // gramJS: skip _updateLoop when we only fetch messages / media
    receiveUpdates: false,
  } as const;
}
