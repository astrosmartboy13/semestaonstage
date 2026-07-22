[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("begin", "register", "status", "stop", "log", "browser")]
    [string] $Action,

    [string] $Component = "",
    [string[]] $ProcessName = @(),
    [int] $Port = 0,
    [string] $Message = ""
)

$ErrorActionPreference = "Stop"
$LauncherRoot = $PSScriptRoot
$StateDir = Join-Path $LauncherRoot "state"
$LogDir = Join-Path $LauncherRoot "logs"
$StatePath = Join-Path $StateDir "state.json"
$ConfigPath = Join-Path $LauncherRoot "config.json"
$LocalConfigPath = Join-Path $LauncherRoot "config.local.json"

function Ensure-Dirs {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Read-JsonObject {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Merge-Object {
    param($Base, $Overlay)
    if ($null -eq $Overlay) {
        return $Base
    }
    foreach ($property in $Overlay.PSObject.Properties) {
        if ($Base.PSObject.Properties.Name -contains $property.Name -and
            $Base.$($property.Name) -is [pscustomobject] -and
            $property.Value -is [pscustomobject]) {
            Merge-Object -Base $Base.$($property.Name) -Overlay $property.Value
        } else {
            $Base | Add-Member -NotePropertyName $property.Name -NotePropertyValue $property.Value -Force
        }
    }
    return $Base
}

function Read-Config {
    $config = Read-JsonObject $ConfigPath
    if ($null -eq $config) {
        throw "Launcher_v2 config.json tidak ditemukan."
    }
    $local = Read-JsonObject $LocalConfigPath
    return Merge-Object -Base $config -Overlay $local
}

function Read-State {
    Ensure-Dirs
    if (-not (Test-Path -LiteralPath $StatePath)) {
        return [pscustomobject]@{
            version = 1
            updatedAt = (Get-Date).ToUniversalTime().ToString("o")
            components = [pscustomobject]@{}
            snapshots = [pscustomobject]@{}
        }
    }
    try {
        return Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    } catch {
        return [pscustomobject]@{
            version = 1
            corrupted = $true
            error = $_.Exception.Message
            updatedAt = (Get-Date).ToUniversalTime().ToString("o")
            components = [pscustomobject]@{}
            snapshots = [pscustomobject]@{}
        }
    }
}

function Save-State {
    param($State)
    Ensure-Dirs
    $State.updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    $json = $State | ConvertTo-Json -Depth 12
    $null = $json | ConvertFrom-Json
    $tempPath = Join-Path $StateDir (".state.{0}.tmp" -f $PID)
    Set-Content -LiteralPath $tempPath -Value ($json + [Environment]::NewLine) -Encoding UTF8
    Move-Item -LiteralPath $tempPath -Destination $StatePath -Force
}

function Write-LauncherLog {
    param(
        [string] $Level,
        [string] $Service,
        [string] $Text,
        [int[]] $Pids = @()
    )
    Ensure-Dirs
    $logPath = Join-Path $LogDir ("launcher-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    $pidText = if ($Pids.Count -gt 0) { $Pids -join "," } else { "" }
    $line = "{0}`t{1}`t{2}`tPID={3}`t{4}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Service, $pidText, $Text
    Add-Content -LiteralPath $logPath -Value $line
}

function Get-ProcessIdsByName {
    param([string[]] $Names)
    $ids = @()
    foreach ($name in $Names) {
        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }
        $ids += Get-Process -Name $name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
    }
    return @($ids | Select-Object -Unique)
}

function Test-ProcessAlive {
    param([int] $ProcessId)
    return $ProcessId -gt 0 -and $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Get-PortOwners {
    param([int] $PortNumber)
    if ($PortNumber -le 0) {
        return @()
    }
    $owners = @()
    $lines = netstat -ano -p tcp 2>$null | Select-String -Pattern "LISTENING"
    foreach ($line in $lines) {
        $text = $line.ToString().Trim()
        if ($text -match "[:\.]$PortNumber\s+.*LISTENING\s+(\d+)$") {
            $owners += [int] $Matches[1]
        }
    }
    return @($owners | Select-Object -Unique)
}

function Test-Http {
    param([string] $Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return [pscustomobject]@{ Online = $true; StatusCode = [int] $response.StatusCode; Error = "" }
    } catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int] $_.Exception.Response.StatusCode
        }
        return [pscustomobject]@{ Online = $false; StatusCode = $statusCode; Error = $_.Exception.Message }
    }
}

function Add-Or-SetProperty {
    param($Object, [string] $Name, $Value)
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
}

function Invoke-Begin {
    param([string] $Name, [string[]] $Names)
    $state = Read-State
    $pids = Get-ProcessIdsByName $Names
    Add-Or-SetProperty -Object $state.snapshots -Name $Name -Value ([pscustomobject]@{
        processNames = $Names
        pids = @($pids)
        capturedAt = (Get-Date).ToUniversalTime().ToString("o")
    })
    Save-State $state
    Write-LauncherLog -Level "BEGIN" -Service $Name -Text "Snapshot captured" -Pids $pids
}

function Invoke-Register {
    param([string] $Name, [string[]] $Names, [int] $PortNumber)
    $state = Read-State
    $snapshot = $state.snapshots.$Name
    $before = @()
    if ($snapshot -and $snapshot.pids) {
        $before = @($snapshot.pids | ForEach-Object { [int] $_ })
    }
    $current = @(Get-ProcessIdsByName $Names)
    $newPids = @($current | Where-Object { $before -notcontains $_ })
    $portOwners = @(Get-PortOwners $PortNumber)
    $owned = @($newPids + ($portOwners | Where-Object { $newPids -contains $_ }) | Select-Object -Unique)
    if ($owned.Count -eq 0 -and $portOwners.Count -gt 0 -and $before.Count -eq 0) {
        $owned = $portOwners
    }
    $status = if ($PortNumber -gt 0 -and $portOwners.Count -gt 0) { "ONLINE" } elseif ($current.Count -gt 0) { "UNKNOWN" } else { "OFFLINE" }
    Add-Or-SetProperty -Object $state.components -Name $Name -Value ([pscustomobject]@{
        owned = $owned.Count -gt 0
        ownedPids = @($owned)
        observedPids = @($current)
        portOwners = @($portOwners)
        port = $PortNumber
        status = $status
        registeredAt = (Get-Date).ToUniversalTime().ToString("o")
    })
    Save-State $state
    Write-LauncherLog -Level "REGISTER" -Service $Name -Text ("Status {0}" -f $status) -Pids $owned
}

function Invoke-Status {
    $config = Read-Config
    $state = Read-State
    $ontimeUrl = "http://127.0.0.1:$($config.ontimePort)/"
    $timerUrl = "http://127.0.0.1:$($config.ontimePort)/timer/"
    $gatewayUrl = "http://127.0.0.1:$($config.gatewayPort)/health"
    $ontime = Test-Http $ontimeUrl
    $timer = Test-Http $timerUrl
    $gateway = Test-Http $gatewayUrl
    $tunnelPids = Get-ProcessIdsByName @("cloudflared")
    $stateStatus = if ($state.corrupted) { "CORRUPTED" } elseif (Test-Path -LiteralPath $StatePath) { "OK" } else { "MISSING" }

    Write-Host ""
    Write-Host "SIGNAL13 Launcher_v2 Status"
    Write-Host "---------------------------"
    Write-Host ("OnTime  : {0}  localhost:4001={1}  timer={2}" -f ($(if ($ontime.Online) { "ONLINE" } else { "OFFLINE" }), $ontime.StatusCode, $timer.StatusCode))
    Write-Host ("Gateway : {0}  localhost:8080/health={1}" -f ($(if ($gateway.Online) { "ONLINE" } else { "OFFLINE" }), $gateway.StatusCode))
    Write-Host ("Tunnel  : {0}  pids={1}" -f ($(if ($tunnelPids.Count -gt 0) { "ONLINE" } else { "UNKNOWN" }), ($(if ($tunnelPids.Count -gt 0) { $tunnelPids -join "," } else { "-" }))))
    Write-Host ("State   : {0}  {1}" -f $stateStatus, $StatePath)
    Write-Host ""
    foreach ($componentName in @("ontime", "gateway", "tunnel")) {
        $componentState = $state.components.$componentName
        if ($componentState) {
            $alive = @($componentState.ownedPids | Where-Object { Test-ProcessAlive ([int] $_) })
            Write-Host ("{0} ownership: owned={1} ownedPids={2} aliveOwnedPids={3}" -f $componentName, $componentState.owned, (($componentState.ownedPids) -join ","), ($alive -join ","))
        } else {
            Write-Host ("{0} ownership: none" -f $componentName)
        }
    }
}

function Invoke-StopOwned {
    $state = Read-State
    foreach ($componentName in @("tunnel", "gateway", "ontime")) {
        $componentState = $state.components.$componentName
        if (-not $componentState -or -not $componentState.owned -or -not $componentState.ownedPids) {
            Write-Host ("{0}: no owned PID, skip safe stop" -f $componentName)
            Write-LauncherLog -Level "STOP" -Service $componentName -Text "No owned PID, skipped"
            continue
        }
        foreach ($pidValue in @($componentState.ownedPids)) {
            $pidInt = [int] $pidValue
            if (Test-ProcessAlive $pidInt) {
                Write-Host ("Stopping {0} PID {1}" -f $componentName, $pidInt)
                Stop-Process -Id $pidInt -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
                if (Test-ProcessAlive $pidInt) {
                    Stop-Process -Id $pidInt -Force -ErrorAction SilentlyContinue
                }
                Write-LauncherLog -Level "STOP" -Service $componentName -Text "Stopped owned PID" -Pids @($pidInt)
            } else {
                Write-Host ("{0}: stale PID {1}" -f $componentName, $pidInt)
                Write-LauncherLog -Level "STOP" -Service $componentName -Text "Stale PID cleared" -Pids @($pidInt)
            }
        }
        Add-Or-SetProperty -Object $state.components -Name $componentName -Value ([pscustomobject]@{
            owned = $false
            ownedPids = @()
            observedPids = @()
            portOwners = @()
            status = "OFFLINE"
            stoppedAt = (Get-Date).ToUniversalTime().ToString("o")
        })
    }
    Save-State $state
}

function Invoke-BrowserOpen {
    $config = Read-Config
    if ($config.browser -and $config.browser.open -eq $false) {
        Write-LauncherLog -Level "BROWSER" -Service "browser" -Text "Browser open disabled"
        return
    }
    $urls = @(
        $config.localUrls.editor,
        $config.localUrls.timer,
        $config.localUrls.backstage,
        $config.onlineUrls.dashboard,
        $config.onlineUrls.timer,
        $config.onlineUrls.admin
    )
    foreach ($url in $urls) {
        if ([string]::IsNullOrWhiteSpace($url)) {
            continue
        }
        Start-Process $url
        Write-LauncherLog -Level "BROWSER" -Service "browser" -Text ("Opened {0}" -f $url)
        Start-Sleep -Milliseconds 250
    }
}

Ensure-Dirs

switch ($Action) {
    "begin" {
        Invoke-Begin -Name $Component -Names $ProcessName
    }
    "register" {
        Invoke-Register -Name $Component -Names $ProcessName -PortNumber $Port
    }
    "status" {
        Invoke-Status
    }
    "stop" {
        Invoke-StopOwned
    }
    "log" {
        Write-LauncherLog -Level "INFO" -Service $Component -Text $Message
    }
    "browser" {
        Invoke-BrowserOpen
    }
}
