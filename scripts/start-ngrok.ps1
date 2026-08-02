# Start ngrok tunnel for the RemindAI backend (port 5000)
# Prerequisites:
#   1. ngrok installed
#   2. Authtoken configured: ngrok config add-authtoken YOUR_TOKEN
#   3. Backend running on port 5000

$ErrorActionPreference = "Stop"
$port = 5000
$envFile = Join-Path $PSScriptRoot "..\.env"

Write-Host "Starting ngrok on port $port..." -ForegroundColor Cyan
Write-Host "Leave this window open. Public URL appears below and at http://127.0.0.1:4040" -ForegroundColor Yellow
Write-Host ""

# Start ngrok with JSON API enabled (default on 4040)
$ngrok = Start-Process -FilePath "ngrok" -ArgumentList @("http", "$port", "--log=stdout") -PassThru -NoNewWindow

Start-Sleep -Seconds 3

try {
  $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
  $https = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1

  if (-not $https) {
    Write-Host "No HTTPS tunnel yet. Open http://127.0.0.1:4040 to inspect." -ForegroundColor Red
    Wait-Process -Id $ngrok.Id
    exit 1
  }

  $publicUrl = $https.public_url
  Write-Host "Public URL: $publicUrl" -ForegroundColor Green

  if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "(?m)^BASE_URL=.*$") {
      $content = $content -replace "(?m)^BASE_URL=.*$", "BASE_URL=$publicUrl"
    } else {
      $content = "BASE_URL=$publicUrl`r`n" + $content
    }
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "Updated backend/.env BASE_URL" -ForegroundColor Green
  }

  Write-Host ""
  Write-Host "Next: set Telegram webhook (replace TOKEN and SECRET from .env):" -ForegroundColor Yellow
  Write-Host @"
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" -H "Content-Type: application/json" -d "{\"url\":\"$publicUrl/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\",\"allowed_updates\":[\"message\"]}"
"@
  Write-Host ""
  Write-Host "Press Ctrl+C to stop ngrok." -ForegroundColor Cyan

  Wait-Process -Id $ngrok.Id
} catch {
  Write-Host "Failed to read ngrok API. Is authtoken configured?" -ForegroundColor Red
  Write-Host "Get token: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
  Write-Host "Then run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
  if (-not $ngrok.HasExited) { Stop-Process -Id $ngrok.Id -Force }
  throw
}
