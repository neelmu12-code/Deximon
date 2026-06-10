$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

docker compose up -d postgres redis api
docker compose exec -T api alembic upgrade head

Write-Host "Database migrations applied."
