# Reproducible vector icon rasterization using the Windows drawing library.
Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
foreach ($spec in @(@('icon-192.png', 192), @('icon-512.png', 512), @('maskable-512.png', 512), @('apple-touch-icon.png', 180))) {
    $size = [int]$spec[1]
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#064e3b'))
    $graphics.ScaleTransform($size / 100, $size / 100)
    $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#ecfdf5'), 4)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    foreach ($line in @(@(34,36,24,27,24,42,35,50), @(66,36,76,27,76,42,65,50), @(36,33,64,33,68,60,60,72,40,72,32,60,36,33), @(40,56,60,56,64,65,57,72,43,72,36,65,40,56))) {
        $points = [System.Drawing.PointF[]]::new($line.Count / 2)
        for ($index = 0; $index -lt $points.Count; $index++) { $points[$index] = [System.Drawing.PointF]::new($line[$index * 2], $line[$index * 2 + 1]) }
        $graphics.DrawLines($pen, $points)
    }
    $graphics.DrawLine($pen, 41, 46, 42, 46)
    $graphics.DrawLine($pen, 58, 46, 59, 46)
    $graphics.DrawLine($pen, 44, 64, 45, 64)
    $graphics.DrawLine($pen, 55, 64, 56, 64)
    $bitmap.Save((Join-Path $iconDir $spec[0]), [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
