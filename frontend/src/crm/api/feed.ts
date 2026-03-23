import { api } from './client';
import type { FeedStatus } from './types';

export async function getFeedStatus(): Promise<FeedStatus> {
  return api.get('/feed/status');
}

export async function runFeedDownload(): Promise<{ message: string; status: FeedStatus['status'] }> {
  return api.post('/feed/download');
}

export async function runFeedSync(): Promise<{ message: string; status: FeedStatus['status'] }> {
  return api.post('/feed/sync');
}
