# Full production DB → local Docker (read-only export on server).
# Requires: SSH key ~/.ssh/id_ed25519_beget, Docker, pnpm, dump dir ~/livegrid-snapshots
#
# Usage:
#   .\scripts\sync-prod-db-windows.ps1
#   .\scripts\sync-prod-db-windows.ps1 -SkipRestore   # export + download only

param(
  [switch]$SkipRestore,
  [string]$RemoteHost = "root@85.198.64.93",
  [string]$SshKey = "$env:USERPROFILE\.ssh\id_ed25519_beget"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SnapshotsDir = Join-Path $env:USERPROFILE "livegrid-snapshots"
$Date = Get-Date -Format "yyyyMMdd"
$RemoteDump = "/tmp/lg_production_$Date.dump"
$LocalDump = Join-Path $SnapshotsDir "lg_production_$Date.dump"

New-Item -ItemType Directory -Force -Path $SnapshotsDir | Out-Null

Write-Host "[sync] Upload export script to server..."
scp -i $SshKey (Join-Path $RepoRoot "scripts\prod-db-export.sh") "${RemoteHost}:/tmp/prod-db-export.sh"

Write-Host "[sync] READ-ONLY pg_dump on production (may take several minutes)..."
ssh -i $SshKey $RemoteHost "sed -i 's/\r$//' /tmp/prod-db-export.sh && chmod +x /tmp/prod-db-export.sh && ALLOW_PROD_DB_EXPORT=yes bash /tmp/prod-db-export.sh $RemoteDump"

Write-Host "[sync] Download dump..."
scp -i $SshKey "${RemoteHost}:${RemoteDump}" $LocalDump

$sizeMb = [math]::Round((Get-Item $LocalDump).Length / 1MB, 1)
Write-Host "[sync] Local dump: $LocalDump ($sizeMb MB)"

if (-not $SkipRestore) {
  & (Join-Path $RepoRoot "scripts\restore-prod-db-local.ps1") -DumpPath $LocalDump
}

Write-Host "[sync] Optional: remove remote dump to free disk:"
Write-Host "  ssh -i $SshKey $RemoteHost rm -f $RemoteDump"
