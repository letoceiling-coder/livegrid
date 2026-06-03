# Restore production PostgreSQL dump into local Docker (lg_development).
# Prerequisites: docker compose postgres up, dump file in ~/livegrid-snapshots/
#
# Usage:
#   .\scripts\restore-prod-db-local.ps1 -DumpPath "$env:USERPROFILE\livegrid-snapshots\lg_production_20260603.dump"
#   .\scripts\restore-prod-db-local.ps1 -DumpPath ... -SkipSanitize   # advanced

param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,
  [switch]$SkipSanitize,
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SnapshotsDir = Join-Path $env:USERPROFILE "livegrid-snapshots"

if (-not (Test-Path $DumpPath)) {
  throw "Dump not found: $DumpPath"
}

$DbUrl = "postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development"
$EnvFile = Join-Path $RepoRoot ".env"
$EnvExample = Join-Path $RepoRoot ".env.example"

Write-Host "[restore] Ensuring Docker postgres is up..."
Push-Location $RepoRoot
docker compose up -d postgres redis | Out-Null
Pop-Location

Write-Host "[restore] Waiting for PostgreSQL..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    docker exec livegrid-postgres-1 pg_isready -U lg_admin -d lg_development | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $ready) { throw "PostgreSQL is not ready" }

Write-Host "[restore] Clearing lg_development (before full pg_restore)..."
docker exec livegrid-postgres-1 psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO lg_admin; GRANT ALL ON SCHEMA public TO public;"
Write-Host "[restore] Enabling PostGIS..."
docker exec livegrid-postgres-1 psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS postgis;"

Write-Host "[restore] pg_restore from dump (via Docker postgres container)..."
$DumpInContainer = "/tmp/restore.dump"
docker cp $DumpPath "livegrid-postgres-1:${DumpInContainer}"
docker exec livegrid-postgres-1 pg_restore `
  --dbname=lg_development `
  --username=lg_admin `
  --no-owner `
  --no-privileges `
  --verbose `
  $DumpInContainer
docker exec livegrid-postgres-1 rm -f $DumpInContainer

Write-Host "[restore] Applying pending Prisma migrations (if any)..."
$env:DATABASE_URL = $DbUrl
Push-Location (Join-Path $RepoRoot "packages\database")
npx prisma migrate deploy
Pop-Location

if (-not $SkipSanitize) {
  Write-Host "[restore] Sanitizing secrets and PII..."
  Get-Content (Join-Path $RepoRoot "scripts\sanitize-local-map-snapshot.sql") -Raw |
    docker exec -i livegrid-postgres-1 psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1
}

if (-not $SkipSeed) {
  Write-Host "[restore] Seeding local admin and CMS defaults..."
  $env:DATABASE_URL = $DbUrl
  Push-Location (Join-Path $RepoRoot "packages\database")
  npx prisma generate | Out-Null
  npx tsx prisma/seed.ts
  Pop-Location
}

Write-Host "[restore] Updating .env DATABASE_URL (backup: .env.before-local-restore)"
if (Test-Path $EnvFile) {
  Copy-Item $EnvFile "$EnvFile.before-local-restore" -Force
  $content = Get-Content $EnvFile -Raw
  if ($content -match "(?m)^DATABASE_URL=.*$") {
    $content = $content -replace "(?m)^DATABASE_URL=.*$", "DATABASE_URL=$DbUrl"
  } else {
    $content = "DATABASE_URL=$DbUrl`n" + $content
  }
  if ($content -match "(?m)^NODE_ENV=production") {
    $content = $content -replace "(?m)^NODE_ENV=production", "NODE_ENV=development"
  }
  Set-Content $EnvFile $content -NoNewline
} elseif (Test-Path $EnvExample) {
  Copy-Item $EnvExample $EnvFile
  Add-Content $EnvFile "`nDATABASE_URL=$DbUrl"
}

Write-Host "[restore] Verify counts:"
docker exec livegrid-postgres-1 psql -U lg_admin -d lg_development -c "SELECT 'blocks' AS t, count(*) FROM blocks UNION ALL SELECT 'listings', count(*) FROM listings UNION ALL SELECT 'users', count(*) FROM users;"

Write-Host ""
Write-Host "Done. Start stack:"
Write-Host "  cd $RepoRoot"
Write-Host "  pnpm --filter @lg/shared build"
Write-Host "  pnpm dev:api"
Write-Host "  pnpm dev:web"
Write-Host "Snapshots dir: $SnapshotsDir"
