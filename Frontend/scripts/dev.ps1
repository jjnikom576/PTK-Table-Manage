<#
  Dev launcher for School Schedule project (Windows PowerShell)
  - Serves static frontend at http://localhost:8000
  - Starts Admin API at http://localhost:8080
  Usage: Right-click -> Run with PowerShell, or: powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
#>

param(
  [int]$WebPort = 8000,
  [int]$ApiPort = 8080
)

$ErrorActionPreference = 'Stop'

function Start-Proc($name, $file, $args, $workdir) {
  Write-Host "Starting $name..." -ForegroundColor Cyan
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $file
  $psi.Arguments = $args
  $psi.WorkingDirectory = $workdir
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $null = $proc.Start()
  Start-Job -Name "$name-log" -ScriptBlock {
    param($p)
    while (-not $p.HasExited) {
      if (-not $p.StandardOutput.EndOfStream) { $p.StandardOutput.ReadLine() }
      if (-not $p.StandardError.EndOfStream) { $p.StandardError.ReadLine() }
      Start-Sleep -Milliseconds 50
    }
  } -ArgumentList $proc | Out-Null
  return $proc
}

$root = Split-Path $PSScriptRoot -Parent

# Start static web server
$webArgs = "-m http.server $WebPort"
$web = Start-Proc -name "web" -file "python" -args $webArgs -workdir $root

# Start Admin API
$env:ADMIN_API_PORT = "$ApiPort"
$api = Start-Proc -name "api" -file "python" -args "server/app.py" -workdir $root

Write-Host ""; Write-Host "✅ Dev servers started" -ForegroundColor Green
Write-Host "- Web:  http://localhost:$WebPort" -ForegroundColor Green
Write-Host "- API:  http://localhost:$ApiPort/api (health: /health)" -ForegroundColor Green

try {
  if (Get-Command start -ErrorAction SilentlyContinue) {
    start "http://localhost:$WebPort"
  } else {
    Start-Process "http://localhost:$WebPort"
  }
} catch {}

Write-Host ""; Write-Host "Press Ctrl+C to stop (close this window)."
Wait-Process -Id @($web.Id, $api.Id)

