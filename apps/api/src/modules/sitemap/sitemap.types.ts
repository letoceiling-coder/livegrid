export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

export type SitemapChunkMeta = {
  filename: string;
  urlCount: number;
  gzipBytes?: number;
  xmlBytes: number;
};

export type SitemapGenerationReport = {
  generatedAt: string;
  durationMs: number;
  siteUrl: string;
  outputDir: string;
  reason: string;
  chunks: SitemapChunkMeta[];
  counts: {
    static: number;
    complexes: number;
    apartments: number;
    listings: number;
    total: number;
  };
  indexFile: string;
};

export type SitemapMetrics = {
  lastGeneration: SitemapGenerationReport | null;
  outputDir: string;
  siteUrl: string;
  indexUrl: string;
  chunkFiles: string[];
  totalUrls: number | null;
};
