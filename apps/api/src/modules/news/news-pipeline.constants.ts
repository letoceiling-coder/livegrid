export const NEWS_PIPELINE_QUEUE = 'news-pipeline';

export const NEWS_JOB_IMPORT = 'import';
export const NEWS_JOB_REWRITE = 'rewrite';
export const NEWS_JOB_REWRITE_BULK = 'rewrite-bulk';
export const NEWS_JOB_PUBLISH = 'publish';
export const NEWS_JOB_PUBLISH_BULK = 'publish-bulk';
export const NEWS_JOB_DOWNLOAD_MEDIA = 'download-media';

export type NewsImportJob = {
  kind: typeof NEWS_JOB_IMPORT;
  onlyChannelIds?: number[] | null;
  limitPerChannel?: number | null;
};

export type NewsRewriteJob = {
  kind: typeof NEWS_JOB_REWRITE;
  newsId: number;
};

export type NewsRewriteBulkJob = {
  kind: typeof NEWS_JOB_REWRITE_BULK;
  newsIds?: number[] | null;
  statusFilter?: 'NEW' | null;
};

export type NewsPublishJob = {
  kind: typeof NEWS_JOB_PUBLISH;
  newsId: number;
};

export type NewsPublishBulkJob = {
  kind: typeof NEWS_JOB_PUBLISH_BULK;
  newsIds?: number[] | null;
};

export type NewsPipelineJobData =
  | NewsImportJob
  | NewsRewriteJob
  | NewsRewriteBulkJob
  | NewsPublishJob
  | NewsPublishBulkJob;
