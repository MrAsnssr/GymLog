# Quick start script - starts everything
Write-Host "🚀 Starting Gym Tracker Development Environment..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path "frontend\.env")) {
    Write-Host "⚠️  .env file not found. Running setup first..." -ForegroundColor Yellow
    .\setup.ps1
    if ($LASTEXITCODE -ne 0) {
        exit 1
    }
}

# Check if Supabase is running
Write-Host "`n🔍 Checking Supabase status..." -ForegroundColor Yellow
$supabaseRunning = $false
try {
    supabase status | Out-Null
    $supabaseRunning = $true
    Write-Host "✅ Supabase is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Supabase is not running. Starting it..." -ForegroundColor Yellow
    supabase start
    Start-Sleep -Seconds 5
    $supabaseRunning = $true
}

if ($supabaseRunning) {
    Write-Host "`n🌐 Starting frontend development server..." -ForegroundColor Yellow
    Set-Location frontend
    npm run dev
} else {
    Write-Host "❌ Failed to start Supabase. Please check Docker Desktop is running." -ForegroundColor Red
}


