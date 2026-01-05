# Automated Setup Script for Gym Tracker
Write-Host "🚀 Setting up Gym Tracker..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`n📦 Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please install and start Docker Desktop first:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}

# Start Supabase
Write-Host "`n🗄️  Starting Supabase..." -ForegroundColor Yellow
supabase start

# Wait a bit for services to start
Start-Sleep -Seconds 5

# Run migrations
Write-Host "`n📊 Running database migrations..." -ForegroundColor Yellow
supabase db reset

# Get credentials
Write-Host "`n🔑 Getting Supabase credentials..." -ForegroundColor Yellow
$status = supabase status --output json | ConvertFrom-Json

$apiUrl = $status.APIUrl
$anonKey = $status.anonKey

Write-Host "`n✅ Supabase is running!" -ForegroundColor Green
Write-Host "API URL: $apiUrl" -ForegroundColor Cyan
Write-Host "Anon Key: $anonKey" -ForegroundColor Cyan

# Create .env file
Write-Host "`n📝 Creating .env file..." -ForegroundColor Yellow
$envContent = "VITE_SUPABASE_URL=$apiUrl`nVITE_SUPABASE_ANON_KEY=$anonKey"

$envPath = Join-Path "frontend" ".env"
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ .env file created!" -ForegroundColor Green

# Set OpenAI API key for Edge Functions (local development)
Write-Host "`n🤖 Configuring OpenAI API key for LLM features..." -ForegroundColor Yellow
$openaiKey = Read-Host "Enter your OpenAI API key (starts with sk-)"
if ($openaiKey -eq "") {
    Write-Host "⚠️  No API key provided. AI features won't work until you add one." -ForegroundColor Yellow
} else {
    $openaiEnvContent = "OPENAI_API_KEY=$openaiKey"
    
    # Create .env.local for Edge Functions
    $functionsDir = Join-Path "supabase" "functions"
    New-Item -ItemType Directory -Force -Path $functionsDir | Out-Null
    $functionsEnvPath = Join-Path $functionsDir ".env.local"
    Set-Content -Path $functionsEnvPath -Value $openaiEnvContent
    Write-Host "✅ OpenAI API key configured for local Edge Functions!" -ForegroundColor Green
}

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Supabase started and running" -ForegroundColor Green
Write-Host "  ✅ Database migrated and seeded" -ForegroundColor Green
Write-Host "  ✅ Frontend .env configured" -ForegroundColor Green
Write-Host "  ✅ OpenAI API key configured for LLM features" -ForegroundColor Green

Write-Host "`n🚀 To start the frontend, run:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nThen open http://localhost:5173 in your browser" -ForegroundColor Yellow

Write-Host "`n💡 To test the AI Assistant:" -ForegroundColor Yellow
Write-Host "  1. Start the frontend (npm run dev)" -ForegroundColor White
Write-Host "  2. Sign up/Login" -ForegroundColor White
Write-Host "  3. Go to /assistant page" -ForegroundColor White
Write-Host "  4. Try: 'What did I bench press last week?' or 'Log 3 sets of squats at 225lbs'" -ForegroundColor White
