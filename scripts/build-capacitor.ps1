$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"

if (Test-Path $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}

New-Item -ItemType Directory -Path $dist | Out-Null

$files = @(
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "service-worker.js",
  "version.json"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $dist $file)
}

Copy-Item -LiteralPath (Join-Path $root "assets") -Destination (Join-Path $dist "assets") -Recurse

Add-Type -AssemblyName System.Drawing

function Resize-Png {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][int]$MaxWidth,
    [Parameter(Mandatory = $true)][int]$MaxHeight
  )

  $source = [System.Drawing.Image]::FromFile($Path)
  try {
    if ($source.Width -le $MaxWidth -and $source.Height -le $MaxHeight) {
      return
    }

    $scale = [Math]::Min($MaxWidth / $source.Width, $MaxHeight / $source.Height)
    $width = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
    $target = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$Path.tmp"
      $target.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $target.Dispose()
    }
  } finally {
    $source.Dispose()
  }

  Move-Item -LiteralPath $tempPath -Destination $Path -Force
}

$iconRoot = Join-Path $dist "assets\icons"
$resizeRules = @(
  @{ Path = "APP"; Width = 512; Height = 512 },
  @{ Path = "Character"; Width = 256; Height = 256 },
  @{ Path = "Navbar ICON"; Width = 160; Height = 160 },
  @{ Path = "Task ICON"; Width = 320; Height = 320 },
  @{ Path = "Urgent"; Width = 256; Height = 256 },
  @{ Path = "Hero Banner"; Width = 900; Height = 420 }
)

foreach ($rule in $resizeRules) {
  $folder = Join-Path $iconRoot $rule.Path
  if (-not (Test-Path $folder)) {
    continue
  }

  Get-ChildItem -LiteralPath $folder -File -Include *.png,*.jpg,*.jpeg | ForEach-Object {
    Resize-Png -Path $_.FullName -MaxWidth $rule.Width -MaxHeight $rule.Height
  }
}

Write-Host "Capacitor web assets copied to dist"
