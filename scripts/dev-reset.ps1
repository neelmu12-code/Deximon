param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $Force) {
  Write-Host "This will stop Deximon and delete Docker volumes, including the local Postgres database."
  Write-Host "Re-run with -Force to continue."
  exit 1
}

docker compose down -v
docker compose up -d --build postgres redis api web scanner
docker compose exec -T api alembic upgrade head
docker compose exec -T api python -m app.scripts.seed

Write-Host "Deximon local stack has been reset."
