#
# Zip the project for Azure App Service Linux deploy.
#
# Why not Compress-Archive: PowerShell 5.1's Compress-Archive writes
# backslash-separated entry paths, which Linux treats as literal filenames.
# We use System.IO.Compression.ZipArchive directly and normalize to '/'.
#
# Excludes: node_modules, .next, .git, .env.local, .vscode, .local-*, *.zip
#
param(
  [string]$OutPath = "deploy.zip"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName "System.IO.Compression"
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$root = (Get-Location).Path
$outFull = Join-Path $root $OutPath

if (Test-Path $outFull) { Remove-Item $outFull -Force }

# Exclusion patterns relative to repo root. Any file whose path starts with
# one of these (after normalization) is skipped.
$excludePrefixes = @(
  "node_modules/",
  ".next/",
  ".git/",
  ".vscode/",
  ".local-articles/",
  ".local-prompts/"
)
$excludeFiles = @(
  ".env.local",
  "deploy.zip"
)

$zipStream = [System.IO.File]::Create($outFull)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

$count = 0
try {
  Get-ChildItem -Path $root -Recurse -File -Force | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1) -replace '\\', '/'

    $skip = $false
    foreach ($p in $excludePrefixes) { if ($rel.StartsWith($p)) { $skip = $true; break } }
    if (-not $skip) {
      foreach ($f in $excludeFiles) { if ($rel -eq $f) { $skip = $true; break } }
    }
    if ($skip) { return }

    $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    try {
      $fileStream = [System.IO.File]::OpenRead($_.FullName)
      try { $fileStream.CopyTo($entryStream) } finally { $fileStream.Dispose() }
    } finally { $entryStream.Dispose() }

    $count++
  }
} finally {
  $archive.Dispose()
  $zipStream.Dispose()
}

$size = [math]::Round((Get-Item $outFull).Length / 1MB, 2)
Write-Host "Wrote $OutPath ($count files, $size MB)"
