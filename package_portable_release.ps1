param(
    [switch]$SkipBuild,
    [string]$Version = "dev"
)

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "release_portable"
$packageName = (-join [char[]](0x86CB,0x79CD,0x52A9,0x624B))
$releaseName = "$packageName-$Version"
$exeName = "$packageName.exe"
$packageDir = Join-Path $releaseRoot $releaseName
$zipPath = Join-Path $releaseRoot "$releaseName.zip"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Path {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Label missing: $Path"
    }
}

Push-Location $projectRoot
try {
    if (-not $SkipBuild) {
        Write-Step "Build frontend"
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed."
        }

        Write-Step "Build desktop executable"
        & npm.cmd run tauri -- build --bundles msi
        if ($LASTEXITCODE -ne 0) {
            throw "Desktop executable build failed."
        }
    }

    $exeCandidates = @(
        (Join-Path $projectRoot "src-tauri\target\release\egg-group-helper.exe"),
        (Join-Path $projectRoot "src-tauri\target\release\rocom-egg-helper.exe")
    )

    $sourceExe = $exeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $sourceExe) {
        throw "Executable not found. Build the project first, or run this script without -SkipBuild."
    }

    $sourceReadme = Join-Path $projectRoot "README.md"
    $sourceLicense = Join-Path $projectRoot "LICENSE"
    $sourceUserDataTemplate = Join-Path $projectRoot "portable_user_data.template.json"
    $sourceDataDir = Join-Path $projectRoot "public\rocom_data"

    Require-Path -Path $sourceReadme -Label "README"
    Require-Path -Path $sourceLicense -Label "LICENSE"
    Require-Path -Path $sourceUserDataTemplate -Label "Portable user data template"
    Require-Path -Path $sourceDataDir -Label "Data directory"

    if (Test-Path -LiteralPath $packageDir) {
        Remove-Item -LiteralPath $packageDir -Recurse -Force
    }
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

    Write-Step "Copy executable and documents"
    Copy-Item -LiteralPath $sourceExe -Destination (Join-Path $packageDir $exeName)
    Copy-Item -LiteralPath $sourceReadme -Destination (Join-Path $packageDir "README.md")
    Copy-Item -LiteralPath $sourceLicense -Destination (Join-Path $packageDir "LICENSE")
    Copy-Item -LiteralPath $sourceUserDataTemplate -Destination (Join-Path $packageDir "rocom-user-data.json")

    Write-Step "Copy data and image assets"
    Copy-Item -LiteralPath $sourceDataDir -Destination (Join-Path $packageDir "rocom_data") -Recurse

    Write-Step "Create zip package"
    Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath

    Write-Host ""
    Write-Host "Portable release directory created:" -ForegroundColor Green
    Write-Host "  $packageDir"
    Write-Host "Zip package created:" -ForegroundColor Green
    Write-Host "  $zipPath"
}
finally {
    Pop-Location
}
