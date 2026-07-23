param(
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Build) {
  docker compose up -d --build
} else {
  docker compose up -d
}

docker compose exec -T api alembic upgrade head
docker compose exec -T api python -m app.scripts.load_tcg_cards

Write-Host "Deximon is running:"
Write-Host "  Web:     http://localhost:3000"
Write-Host "  API:     http://localhost:8000/docs"
Write-Host "  Scanner: http://localhost:8001/healthz"
