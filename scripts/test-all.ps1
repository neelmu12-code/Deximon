param(
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path -LiteralPath ".env")) {
  Write-Host "Missing .env file." -ForegroundColor Red
  Write-Host "Create it from .env.example and set a local JWT_SECRET_KEY:"
  Write-Host "  Copy-Item .env.example .env"
  exit 2
}

docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not available. Start Docker Desktop and run this command again." -ForegroundColor Red
  exit 2
}

if (-not $SkipBuild) {
  Write-Host ""
  Write-Host "Building test images..." -ForegroundColor Cyan
  docker compose build api scanner web
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker image build failed. Test suites were not started." -ForegroundColor Red
    exit 1
  }
}

$results = [System.Collections.Generic.List[object]]::new()

function Invoke-TestSuite {
  param(
    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host "Running $Name" -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray

  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  & $Action
  $exitCode = $LASTEXITCODE
  $timer.Stop()

  $status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
  $script:results.Add(
    [pscustomobject]@{
      Suite = $Name
      Status = $status
      ExitCode = $exitCode
      Duration = $timer.Elapsed
    }
  )
}

Invoke-TestSuite -Name "API tests" -Action {
  docker compose run --rm --no-deps api sh -lc `
    "poetry install --no-root --with dev && poetry run pytest -q"
}

Invoke-TestSuite -Name "Scanner tests" -Action {
  docker compose run --rm --no-deps scanner sh -lc `
    "poetry install --no-root --with dev && poetry run pytest -q"
}

Invoke-TestSuite -Name "Frontend tests" -Action {
  docker compose run --rm --no-deps web npm test
}

Write-Host ""
Write-Host ("=" * 72) -ForegroundColor DarkGray
Write-Host "Deximon test summary" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor DarkGray
Write-Host ("{0,-24} {1,-8} {2,12}" -f "Suite", "Result", "Duration")
Write-Host ("{0,-24} {1,-8} {2,12}" -f ("-" * 20), ("-" * 6), ("-" * 8))

foreach ($result in $results) {
  $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
  $duration = "{0:mm\:ss\.fff}" -f $result.Duration
  Write-Host (
    "{0,-24} {1,-8} {2,12}" -f $result.Suite, $result.Status, $duration
  ) -ForegroundColor $color
}

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
$passedCount = $results.Count - $failed.Count

Write-Host ""
Write-Host "$passedCount of $($results.Count) test suites passed."

if ($failed.Count -gt 0) {
  Write-Host "One or more test suites failed." -ForegroundColor Red
  exit 1
}

Write-Host "All Deximon test suites passed." -ForegroundColor Green
exit 0
