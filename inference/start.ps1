# IntelliBank ML Inference Service — Windows Startup Script
# Usage: .\start.ps1
# Or for custom port: .\start.ps1 -Port 8001

param(
    [int]$Port = 8001,
    [string]$ModelsDir = "..\models"
)

Write-Host ""
Write-Host "  IntelliBank ML Inference Service" -ForegroundColor Cyan
Write-Host "  Port: $Port  |  Models: $ModelsDir" -ForegroundColor Gray
Write-Host ""

$env:MODELS_DIR = $ModelsDir
$env:PORT = $Port

python -m uvicorn main:app --host 0.0.0.0 --port $Port --reload
