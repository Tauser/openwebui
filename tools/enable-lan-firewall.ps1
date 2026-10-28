#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$Port = 3001,
    [string]$ResultPath = (Join-Path $PSScriptRoot '../.data/lan-firewall-result.json')
)

$ErrorActionPreference = 'Stop'
$ruleName = "CodexWebLocal-LAN-$Port"
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
try {
    $existingRule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
    if ($existingRule) {
        Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Private,Domain | Out-Null
        $existingRule | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort $Port | Out-Null
        $existingRule | Get-NetFirewallApplicationFilter | Set-NetFirewallApplicationFilter -Program $nodePath | Out-Null
        $existingRule | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet | Out-Null
    } else {
        New-NetFirewallRule -Name $ruleName -DisplayName "Codex Web Local - LAN TCP $Port" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Program $nodePath -RemoteAddress LocalSubnet -Profile Private,Domain -Enabled True | Out-Null
    }
    $result = @{ success = $true; rule = $ruleName; port = $Port; profiles = @('Private', 'Domain'); remoteAddress = 'LocalSubnet'; program = $nodePath }
} catch {
    $result = @{ success = $false; error = $_.Exception.Message; rule = $ruleName }
}
New-Item -ItemType Directory -Path (Split-Path -Parent $ResultPath) -Force | Out-Null
$result | ConvertTo-Json | Set-Content -LiteralPath $ResultPath -Encoding utf8
if (-not $result.success) { Write-Error $result.error; exit 1 }
Write-Output "Acesso LAN habilitado na porta TCP $Port (rede privada/domínio, subrede local)."
