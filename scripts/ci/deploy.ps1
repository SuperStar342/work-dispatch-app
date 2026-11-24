<#
.SYNOPSIS
  Upload one deployment package to a Linux server over SSH and run the deploy
  script inside it. Shared, identical copy in blade-master, shop-vite-main and
  work-dispatch-app; GitHub Actions and manual deployments both use it.

.DESCRIPTION
  Connection settings come from environment variables, so the same script works
  in a workflow (GitHub Secrets/Variables) and from a local PowerShell window:

    DEPLOY_HOST            server address (required)
    DEPLOY_PORT            SSH port, default 22
    DEPLOY_USER            SSH user (required)
    DEPLOY_AUTH            "key" (default) or "password"
    DEPLOY_KEY             OpenSSH private key text            (key auth)
    DEPLOY_KEY_FILE        path to a private key file instead   (key auth, manual use)
    DEPLOY_PASSWORD        SSH password                         (password auth)
    DEPLOY_HOST_KEY        pinned host public key, e.g. "ssh-ed25519 AAAA..."
    DEPLOY_KNOWN_HOSTS     known_hosts content
    DEPLOY_FP              expected host key fingerprint "SHA256:..."
    DEPLOY_HOST_KEY_ALIAS  name to look the host key up under (optional)
  One of DEPLOY_HOST_KEY, DEPLOY_KNOWN_HOSTS or DEPLOY_FP is required: the host
  key is always verified.

  On the server the package is unpacked into ~/ci-deploy/<id>/ and
  "bash <Entry> <Arguments>" runs there. The token @DIR@ in Arguments becomes
  that directory. The directory is removed afterwards, and leftovers older than
  two days are pruned, so nothing accumulates on the server.

.EXAMPLE
  # Manual deployment from this PC
  $env:DEPLOY_HOST='192.168.251.120'; $env:DEPLOY_USER='root'
  $env:DEPLOY_KEY_FILE="$HOME\.ssh\work_dispatch_deploy_rsa"
  $env:DEPLOY_HOST_KEY='ssh-ed25519 AAAA...'
  .\scripts\ci\deploy.ps1 -Package .\pkg.tar.gz -Entry deploy.sh -Arguments @('arg1')
#>
[CmdletBinding()]
param(
  [string] $Package = '',
  [string] $ReleaseTag = '',
  [string] $AssetName = '',
  [string] $Entry = '',
  [string[]] $Arguments = @(),
  [string] $HealthUrl = '',
  [string[]] $RollbackArguments = @(),
  [switch] $CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Setting([string] $Name, [string] $Default = '') {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Invoke-Native {
  param([scriptblock] $Command, [string] $What)
  $old = $ErrorActionPreference
  try { $ErrorActionPreference = 'Continue'; & $Command; $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = $old }
  if ($code -ne 0) { throw "$What failed (exit code $code)" }
}

function Invoke-WithRetry {
  param([scriptblock] $Command, [string] $What, [int] $Attempts = 5, [int] $DelaySeconds = 15)
  for ($i = 1; $i -le $Attempts; $i++) {
    try { Invoke-Native -Command $Command -What $What; return }
    catch {
      if ($i -ge $Attempts) { throw }
      Write-Warning "$What failed, retrying in ${DelaySeconds}s ($i/$Attempts)"
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

function Protect-File([string] $Path) {
  $me = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls.exe $Path /inheritance:r | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Cannot restrict access to $Path" }
  & icacls.exe $Path /grant:r "${me}:(R)" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Cannot grant read access to $Path" }
}

# Windows PowerShell 5.1 drops embedded double quotes when it starts ssh.exe, so
# remote commands below use single quotes only (paths never contain spaces).
function ConvertTo-ShellWord([string] $Value) {
  if ($Value -eq '@DIR@') { return '$d' }
  if ($Value -notmatch '^[A-Za-z0-9_./:@%+=,-]*$') { throw "Unsupported character in remote argument: $Value" }
  return "'$Value'"
}

# ---------- settings ----------
$serverHost = Get-Setting 'DEPLOY_HOST'
$port = Get-Setting 'DEPLOY_PORT' '22'
$user = Get-Setting 'DEPLOY_USER'
$auth = (Get-Setting 'DEPLOY_AUTH' 'key').ToLowerInvariant()
$hostKey = Get-Setting 'DEPLOY_HOST_KEY'
$knownHosts = Get-Setting 'DEPLOY_KNOWN_HOSTS'
$fingerprint = Get-Setting 'DEPLOY_FP'
$alias = Get-Setting 'DEPLOY_HOST_KEY_ALIAS' $serverHost

if ($serverHost -notmatch '^[A-Za-z0-9.\-]+$') { throw 'DEPLOY_HOST is missing or invalid' }
if ($port -notmatch '^\d{1,5}$') { throw 'DEPLOY_PORT is invalid' }
if ($user -notmatch '^[A-Za-z_][A-Za-z0-9_-]*$') { throw 'DEPLOY_USER is missing or invalid' }
if ($auth -notin @('key', 'password')) { throw 'DEPLOY_AUTH must be key or password' }
if (-not $hostKey -and -not $knownHosts -and -not $fingerprint) {
  throw 'Configure DEPLOY_HOST_KEY, DEPLOY_KNOWN_HOSTS or DEPLOY_FP so the server identity is verified'
}
if (-not $CheckOnly) {
  if ($Entry -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Entry must be a script file name inside the package' }
}

$runId = Get-Setting 'GITHUB_RUN_ID' (Get-Date -Format 'yyyyMMddHHmmss')
$attempt = Get-Setting 'GITHUB_RUN_ATTEMPT' '1'
$repoName = (Get-Setting 'GITHUB_REPOSITORY' 'manual/manual').Split('/')[-1]
$deployId = "$repoName-$runId-$attempt-" + ($serverHost -replace '[^A-Za-z0-9]', '-')
$tempRoot = Get-Setting 'RUNNER_TEMP' ([IO.Path]::GetTempPath())
$work = Join-Path $tempRoot "ci-deploy-$deployId"
New-Item -ItemType Directory -Path $work -Force | Out-Null

try {
  # ---------- package ----------
  if (-not $CheckOnly) {
    if ($ReleaseTag) {
      $token = Get-Setting 'GH_TOKEN'
      $repo = Get-Setting 'GITHUB_REPOSITORY'
      if (-not $token -or -not $repo -or -not $AssetName) { throw 'Release download needs GH_TOKEN, GITHUB_REPOSITORY and -AssetName' }
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'ci-deploy' }
      $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$ReleaseTag" -Headers $headers
      $asset = @($release.assets | Where-Object { $_.name -eq $AssetName }) | Select-Object -First 1
      if ($null -eq $asset) { throw "Asset $AssetName not found in release $ReleaseTag" }
      $Package = Join-Path $work $AssetName
      $headers.Accept = 'application/octet-stream'
      Write-Host "Downloading $AssetName ($([math]::Round($asset.size / 1MB, 1)) MB)..."
      Invoke-WebRequest -UseBasicParsing -Uri $asset.url -Headers $headers -OutFile $Package
      if ((Get-Item -LiteralPath $Package).Length -ne [int64]$asset.size) { throw 'Downloaded package size does not match the release asset' }
    }
    if (-not $Package -or -not (Test-Path -LiteralPath $Package -PathType Leaf)) { throw "Package not found: $Package" }
    $Package = (Resolve-Path -LiteralPath $Package).Path
  }

  # ---------- host key ----------
  $hostsFile = Join-Path $work 'known_hosts'
  if ($hostKey) {
    [IO.File]::WriteAllText($hostsFile, "$alias $hostKey`n", $utf8)
  }
  elseif ($knownHosts) {
    [IO.File]::WriteAllText($hostsFile, (($knownHosts -replace "`r", '').TrimEnd("`n") + "`n"), $utf8)
  }
  else {
    $old = $ErrorActionPreference
    try { $ErrorActionPreference = 'Continue'; $scan = & ssh-keyscan.exe -T 10 -p $port $serverHost 2>$null }
    finally { $ErrorActionPreference = $old }
    if (-not $scan) { throw "ssh-keyscan could not read the host key of $serverHost" }
    [IO.File]::WriteAllText($hostsFile, ((@($scan) -join "`n") + "`n"), $utf8)
  }
  if ($fingerprint -and $auth -eq 'key') {
    $seen = (& ssh-keygen.exe -lf $hostsFile -E sha256) -join "`n"
    if ($seen -notmatch [regex]::Escape($fingerprint)) { throw "Host key of $serverHost does not match DEPLOY_FP" }
  }

  # ---------- client ----------
  if ($auth -eq 'key') {
    Get-Command ssh.exe, scp.exe, ssh-keygen.exe -ErrorAction Stop | Out-Null
    $keyFile = Join-Path $work 'id_deploy'
    $keyText = Get-Setting 'DEPLOY_KEY'
    $keyPath = Get-Setting 'DEPLOY_KEY_FILE'
    if ($keyText) {
      $keyText = ($keyText -replace '\\n', "`n" -replace "`r", '').TrimEnd("`n") + "`n"
      [IO.File]::WriteAllText($keyFile, $keyText, $utf8)
    }
    elseif ($keyPath -and (Test-Path -LiteralPath $keyPath)) { Copy-Item -LiteralPath $keyPath -Destination $keyFile }
    else { throw 'Key authentication needs DEPLOY_KEY or DEPLOY_KEY_FILE' }
    Protect-File $keyFile
    $opts = @('-i', $keyFile, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', "Port=$port",
      '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$hostsFile", '-o', "HostKeyAlias=$alias",
      '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4', '-o', 'LogLevel=ERROR')
    $ssh = { param([string] $Command) & ssh.exe @opts "$user@$serverHost" $Command }
    $copy = { param([string] $Local, [string] $Remote) & scp.exe @opts $Local "${user}@${serverHost}:$Remote" }
  }
  else {
    # Windows OpenSSH cannot take a password non-interactively; use pinned PuTTY tools.
    $password = Get-Setting 'DEPLOY_PASSWORD'
    if (-not $password) { throw 'Password authentication needs DEPLOY_PASSWORD' }
    if (-not $fingerprint) {
      $fingerprint = ((& ssh-keygen.exe -lf $hostsFile -E sha256) -split ' ')[1]
      if (-not $fingerprint) { throw 'Cannot work out the host key fingerprint for plink' }
    }
    $tools = @{
      'plink.exe' = '969f36879d5716aa1a9811f43a6a6510e8f08372dbeb9695b810b9c776f39c75'
      'pscp.exe'  = '4275310c04b4dd00cc139f93b932267df7816fda8e362d4a845660129264f3a1'
    }
    foreach ($name in $tools.Keys) {
      $path = Join-Path $work $name
      Invoke-WebRequest -UseBasicParsing -Uri "https://the.earth.li/~sgtatham/putty/0.85/w64/$name" -OutFile $path -TimeoutSec 120
      if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $tools[$name]) { throw "$name checksum mismatch" }
    }
    $pwFile = Join-Path $work 'password.txt'
    [IO.File]::WriteAllText($pwFile, $password, $utf8)
    Protect-File $pwFile
    $opts = @('-batch', '-noagent', '-P', $port, '-l', $user, '-pwfile', $pwFile, '-hostkey', $fingerprint)
    $plink = Join-Path $work 'plink.exe'
    $pscp = Join-Path $work 'pscp.exe'
    $ssh = { param([string] $Command) & $plink @opts $serverHost $Command }
    $copy = { param([string] $Local, [string] $Remote) & $pscp @opts $Local "${serverHost}:$Remote" }
  }

  Write-Host "Connecting to $user@$serverHost..."
  Invoke-WithRetry -What "SSH login to $serverHost" -Command { & $ssh 'mkdir -p $HOME/ci-deploy && echo SSH_OK' }
  if ($CheckOnly) { Write-Host "SSH check passed: $serverHost"; return }

  # ---------- upload and run ----------
  $remoteArchive = "ci-deploy/$deployId.tar.gz"
  Write-Host "Uploading package ($([math]::Round((Get-Item -LiteralPath $Package).Length / 1MB, 1)) MB)..."
  Invoke-WithRetry -What 'Package upload' -Attempts 3 -Command { & $copy $Package $remoteArchive }

  $prepare = 'set -eu; d=$HOME/ci-deploy/' + $deployId + '; ' +
    'find $HOME/ci-deploy -mindepth 1 -maxdepth 1 -mtime +2 -exec rm -rf -- {} + 2>/dev/null || true; ' +
    'rm -rf -- $d; mkdir -p $d; tar -xzf $d.tar.gz -C $d; rm -f -- $d.tar.gz; cd $d; ' +
    "sed -i 's/\r`$//' $Entry; "
  $cleanup = 'rm -rf -- $HOME/ci-deploy/' + $deployId
  $run = 'bash $d/' + $Entry + ' ' + (($Arguments | ForEach-Object { ConvertTo-ShellWord $_ }) -join ' ')

  if (-not $HealthUrl) {
    Write-Host "Running $Entry on $serverHost..."
    Invoke-Native -What "Remote $Entry" -Command { & $ssh ($prepare + 'trap ''rm -rf -- $d'' EXIT; ' + $run) }
    Write-Host "Deployment finished: $serverHost"
    return
  }

  try {
    Write-Host "Running $Entry on $serverHost..."
    Invoke-Native -What "Remote $Entry" -Command { & $ssh ($prepare + $run) }

    $healthy = $false
    for ($i = 1; $i -le 12 -and -not $healthy; $i++) {
      try {
        $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 10
        $healthy = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
      }
      catch { Write-Warning "Health check $i/12 failed: $($_.Exception.Message)" }
      if (-not $healthy) { Start-Sleep -Seconds 5 }
    }
    if (-not $healthy) {
      if ($RollbackArguments.Count -gt 0) {
        Write-Warning 'Health check failed; restoring the previous version'
        $rollback = 'set -eu; d=$HOME/ci-deploy/' + $deployId + '; bash $d/' + $Entry + ' ' +
          (($RollbackArguments | ForEach-Object { ConvertTo-ShellWord $_ }) -join ' ')
        try { Invoke-Native -What 'Remote rollback' -Command { & $ssh $rollback } }
        catch { Write-Warning $_.Exception.Message }
      }
      throw "Health check failed: $HealthUrl"
    }
    Write-Host "Deployment finished and healthy: $HealthUrl"
  }
  finally {
    try { Invoke-Native -What 'Remote cleanup' -Command { & $ssh $cleanup } } catch { Write-Warning $_.Exception.Message }
  }
}
finally {
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
}
