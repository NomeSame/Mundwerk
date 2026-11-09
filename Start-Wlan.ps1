param([string]$LanAddress='192.168.10.177',[string]$OnionFile='C:\Users\Marco\.tor-standalone\onion\hostname',[int]$OnionPort=4174)
$ErrorActionPreference='Stop'
if([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  throw 'Den Webserver nicht als Administrator starten. Bitte normales PowerShell-Fenster verwenden.'
}
$nodeExecutable=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if(-not(Test-Path -LiteralPath $nodeExecutable)){throw 'Der geprüfte Node-Pfad fehlt. Keine andere Laufzeit automatisch freigeben.'}
$statePath=Join-Path $PSScriptRoot 'outputs\lan-server.json'
if(Test-Path -LiteralPath $statePath){
  $previous=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
  $running=Get-Process -Id $previous.pid -ErrorAction SilentlyContinue
  if($running -and $running.StartTime.ToUniversalTime().Ticks -eq $previous.startedTicks){throw 'Der App-Server läuft bereits. Erst Stop-Wlan.ps1 verwenden.'}
}
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'outputs')|Out-Null
$entry=Join-Path $PSScriptRoot 'server.mjs'
$process=Start-Process -FilePath $nodeExecutable -ArgumentList @('--permission','--disable-proto=throw','--disallow-code-generation-from-strings',('"--allow-fs-read='+$entry+'"'),('"--allow-fs-read='+(Join-Path $PSScriptRoot 'server')+'"'),('"--allow-fs-read='+(Join-Path $PSScriptRoot 'dist')+'"'),('"--allow-fs-read='+$OnionFile+'"'),('"'+$entry+'"'),'--lan',$LanAddress,'--onion-file',$OnionFile,'--onion-port',$OnionPort) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $PSScriptRoot 'outputs\lan-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'outputs\lan-server-error.log')
Start-Sleep -Milliseconds 700
if($process.HasExited){throw 'App-Server konnte nicht starten. Siehe outputs\lan-server-error.log.'}
@{pid=$process.Id;startedTicks=$process.StartTime.ToUniversalTime().Ticks;executable=$nodeExecutable;address=$LanAddress;port=4173;onionPort=$OnionPort;onionFile=$OnionFile}|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding utf8
Write-Output "Handy-Adresse: http://${LanAddress}:4173/"
if(Test-Path -LiteralPath $OnionFile){
  $onionAddress=(Get-Content -LiteralPath $OnionFile -Raw).Trim()
  Write-Output "Tor-Adresse: http://${onionAddress}/ (Tor-Hoerer laeuft separat, der App-Horer hoert nur 127.0.0.1:${OnionPort})"
} else {
  Write-Output "Keine .onion-Ankuendigung gefunden unter $OnionFile - die App laeuft nur im WLAN."
}
Write-Output 'Stoppen: .\Stop-Wlan.ps1. Kein Autostart eingerichtet.'
