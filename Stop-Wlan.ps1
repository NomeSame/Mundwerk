$ErrorActionPreference='Stop'
$statePath=Join-Path $PSScriptRoot 'outputs\lan-server.json'
if(-not(Test-Path -LiteralPath $statePath)){Write-Output 'Kein App-Server vermerkt.';return}
$state=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
$process=Get-Process -Id $state.pid -ErrorAction SilentlyContinue
if($process){
  if($process.Path -ne $state.executable -or $process.StartTime.ToUniversalTime().Ticks -ne $state.startedTicks){throw 'Prozessidentität hat sich geändert; es wird nichts beendet.'}
  Stop-Process -Id $process.Id
}
Remove-Item -LiteralPath $statePath
Write-Output 'Sprachinseln-Webserver beendet. Die Website ist im WLAN nicht mehr erreichbar.'
