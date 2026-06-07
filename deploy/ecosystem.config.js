/** PM2 ecosystem — secrets from server .env, never hardcoded in repo. */
const fs = require('fs');
const path = require('path');

const deployRoot = process.env.DEPLOY_ROOT || '/var/www/lg';

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const fileEnv = parseDotEnv(path.join(deployRoot, '.env'));
const pick = (key, fallback = '') =>
  fileEnv[key] || process.env[key] || fallback;

const publicSiteUrl = pick('PUBLIC_SITE_URL', 'https://livegrid.ru');

if (!pick('DATABASE_URL')) {
  console.warn(
    `[ecosystem] WARN: DATABASE_URL missing in ${deployRoot}/.env — lg-api will not start until .env is configured`,
  );
}

module.exports = {
  apps: [
    {
      name: 'lg-api',
      cwd: `${deployRoot}/apps/api`,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PUBLIC_SITE_URL: publicSiteUrl,
        NODE_ENV: 'production',
        API_PORT: pick('API_PORT', '3000'),
        API_PREFIX: pick('API_PREFIX', '/api/v1'),
        DATABASE_URL: pick('DATABASE_URL'),
        REDIS_URL: pick('REDIS_URL', 'redis://127.0.0.1:6379'),
        JWT_ACCESS_SECRET: pick('JWT_ACCESS_SECRET'),
        JWT_REFRESH_SECRET: pick('JWT_REFRESH_SECRET'),
        TRENDAGENT_BASE_URL: pick('TRENDAGENT_BASE_URL', 'https://dataout.trendagent.ru'),
        TRENDAGENT_DEFAULT_REGION: pick('TRENDAGENT_DEFAULT_REGION', 'msk'),
        TRENDAGENT_REGIONS: pick('TRENDAGENT_REGIONS', 'msk'),
        TELEGRAM_WEBHOOK_URL:
          pick('TELEGRAM_WEBHOOK_URL') ||
          `${publicSiteUrl.replace(/\/$/, '')}/api/v1/telegram-bot/webhook`,
        SENTRY_DSN_API: pick('SENTRY_DSN_API', pick('SENTRY_DSN')),
        SENTRY_ENVIRONMENT: pick('SENTRY_ENVIRONMENT', 'production'),
        SENTRY_TRACES_SAMPLE_RATE: pick('SENTRY_TRACES_SAMPLE_RATE', '0.1'),
        SENTRY_RELEASE: pick('SENTRY_RELEASE'),
        METRICS_BEARER_TOKEN: pick('METRICS_BEARER_TOKEN'),
        FEED_LOCAL_DIR: pick('FEED_LOCAL_DIR'),
        FEED_IMPORT_DISABLE_REPEAT: pick('FEED_IMPORT_DISABLE_REPEAT'),
        FEED_IMPORT_CRON: pick('FEED_IMPORT_CRON', '0 4 * * 1'),
        FEED_IMPORT_CRON_TZ: pick('FEED_IMPORT_CRON_TZ', 'Europe/Moscow'),
        FEED_HTTP_FETCH_ALLOWED: pick('FEED_HTTP_FETCH_ALLOWED', 'true'),
        FEED_MARK_SOLD_MIN_RATIO: pick('FEED_MARK_SOLD_MIN_RATIO', '0.85'),
        FEED_HEALTH_STALE_HOURS: pick('FEED_HEALTH_STALE_HOURS', '200'),
        FEED_HEALTH_STUCK_MINUTES: pick('FEED_HEALTH_STUCK_MINUTES', '120'),
        FEED_STUCK_RECOVERY_INTERVAL_MS: pick('FEED_STUCK_RECOVERY_INTERVAL_MS', '900000'),
        FEED_STUCK_RECOVERY_DISABLE: pick('FEED_STUCK_RECOVERY_DISABLE'),
        FEED_RECOVERY_FORCE: pick('FEED_RECOVERY_FORCE'),
        LISTINGS_EXPIRE_DISABLE: pick('LISTINGS_EXPIRE_DISABLE', 'true'),
        SITEMAP_OUTPUT_DIR: pick('SITEMAP_OUTPUT_DIR', `${deployRoot}/apps/api/sitemaps`),
        SITEMAP_CHUNK_SIZE: pick('SITEMAP_CHUNK_SIZE', '5000'),
        CORS_ORIGINS: pick(
          'CORS_ORIGINS',
          'https://lg.pfrpro.com,https://livegrid.ru,http://localhost:5173',
        ),
        MEDIA_ROOT: pick('MEDIA_ROOT', '/srv/livegrid/uploads'),
        AI_SETTINGS_ENCRYPTION_KEY: pick('AI_SETTINGS_ENCRYPTION_KEY'),
      },
      autorestart: true,
      max_restarts: 100,
      min_uptime: '10s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 10000,
      listen_timeout: 10000,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/lg/api-error.log',
      out_file: '/var/log/lg/api-out.log',
      merge_logs: true,
    },
  ],
};
