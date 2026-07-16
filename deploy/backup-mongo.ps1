param(
  [Parameter(Mandatory = $true)]
  [string]$MongoUri,

  [string]$OutputDirectory = ".\backups"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDirectory "learnnexus-$timestamp"

New-Item -ItemType Directory -Force -Path $target | Out-Null
mongodump --uri="$MongoUri" --out="$target"

if ($LASTEXITCODE -ne 0) {
  throw "MongoDB backup failed with exit code $LASTEXITCODE"
}

Write-Host "MongoDB backup completed: $target"
