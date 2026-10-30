param(
  [Parameter(Mandatory=$true)][string]$LanAddress,
  [Parameter(Mandatory=$true)][string]$NodePath
)
$ErrorActionPreference='Stop'
if([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  throw 'Den Webserver nicht als Administrator starten. Bitte normales PowerShell-Fenster verwenden.'
}
# Rechnerabhängige Pfade gehören nicht in die Repository-Kopie: wer startet, übergibt sie.
$nodeExecutable=(Resolve-Path -LiteralPath $NodePath).Path
if((Split-Path $nodeExecutable -Leaf) -ne 'node.exe'){throw 'Erwartet wird node.exe.'}
$statePath=Join-Path $PSScriptRoot 'outputs\lan-server.json'
if(Test-Path -LiteralPath $statePath){
  $previous=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
  $running=Get-Process -Id $previous.pid -ErrorAction SilentlyContinue
  if($running -and $running.StartTime.ToUniversalTime().Ticks -eq $previous.startedTicks){throw 'Der App-Server läuft bereits. Erst Stop-Wlan.ps1 verwenden.'}
}
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'outputs')|Out-Null
$entry=Join-Path $PSScriptRoot 'server.mjs'
$process=Start-Process -FilePath $nodeExecutable -ArgumentList @('--permission','--disable-proto=throw','--disallow-code-generation-from-strings',('"--allow-fs-read='+$entry+'"'),('"--allow-fs-read='+(Join-Path $PSScriptRoot 'server')+'"'),('"--allow-fs-read='+(Join-Path $PSScriptRoot 'dist')+'"'),('"'+$entry+'"'),'--lan',$LanAddress) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $PSScriptRoot 'outputs\lan-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'outputs\lan-server-error.log')
Start-Sleep -Milliseconds 700
if($process.HasExited){throw 'App-Server konnte nicht starten. Siehe outputs\lan-server-error.log.'}
@{pid=$process.Id;startedTicks=$process.StartTime.ToUniversalTime().Ticks;executable=$nodeExecutable;address=$LanAddress;port=4173}|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding utf8
Write-Output "Handy-Adresse: http://${LanAddress}:4173/"
Write-Output 'Stoppen: .\Stop-Wlan.ps1. Kein Autostart eingerichtet.'
