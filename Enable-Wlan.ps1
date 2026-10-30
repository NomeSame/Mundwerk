param(
  [Parameter(Mandatory=$true)][string]$LanAddress,
  [Parameter(Mandatory=$true)][string]$NodePath
)
$ErrorActionPreference='Stop'
if(-not [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  throw 'Nur die Firewall-Einrichtung benötigt Administratorrechte. Der Webserver muss als normaler Benutzer laufen.'
}
$nodeExecutable=(Resolve-Path -LiteralPath $NodePath).Path
if((Split-Path $nodeExecutable -Leaf) -ne 'node.exe'){throw 'Erwartet wird node.exe.'}
Push-Location -LiteralPath $PSScriptRoot
try {
  $configJson=& $nodeExecutable --input-type=module -e "import {lanConfiguration} from './server/network.mjs'; console.log(JSON.stringify(lanConfiguration(process.argv[1])));" $LanAddress
  if($LASTEXITCODE -ne 0){throw 'LAN-Konfiguration konnte nicht bestätigt werden.'}
  $config=$configJson|ConvertFrom-Json
}finally{Pop-Location}
if($config.prefix -ne 24){throw 'Diese gezielte Freigabe erwartet das geprüfte /24-Heimnetz.'}
if(Get-NetFirewallRule -Name 'Sprachinseln-WLAN-4173' -ErrorAction SilentlyContinue){throw 'Die App-Regel existiert bereits; zuerst ihre Parameter prüfen.'}
New-NetFirewallRule -Name 'Sprachinseln-WLAN-4173' -DisplayName 'Sprachinseln - nur WLAN-Webseite 4173' -Group 'Sprachinseln' `
  -Description 'Nur statische Sprachinseln-Webdateien. Kein Dateizugriff, keine Shell, kein Fernzugriff.' `
  -Direction Inbound -Action Allow -Enabled True -Protocol TCP -LocalPort 4173 `
  -LocalAddress $config.ip -RemoteAddress $config.subnet -InterfaceAlias $config.interfaceAlias `
  -Profile Public,Private -Program $nodeExecutable -EdgeTraversalPolicy Block | Out-Null
Write-Output "Firewall eingerichtet: $($config.ip):4173, nur $($config.subnet), nur $($config.interfaceAlias), nur $nodeExecutable."
Write-Output 'Rücknahme (Administrator): Remove-NetFirewallRule -Name Sprachinseln-WLAN-4173'
