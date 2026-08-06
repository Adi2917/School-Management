Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root "mobile-app\assets\images"
$store = Join-Path $root "mobile-app\store-listing"
New-Item -ItemType Directory -Force -Path $output, $store | Out-Null

function New-Canvas([int]$width, [int]$height, [bool]$transparent = $false) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($transparent) { $graphics.Clear([System.Drawing.Color]::Transparent) } else { $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F6F0E5")) }
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Rounded-Path([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Mark($g, [float]$cx, [float]$cy, [float]$scale, [bool]$mono = $false) {
  $cream = if ($mono) { [System.Drawing.Color]::White } else { [System.Drawing.ColorTranslator]::FromHtml("#FFF8E9") }
  $gold = if ($mono) { [System.Drawing.Color]::White } else { [System.Drawing.ColorTranslator]::FromHtml("#F4B93A") }
  $bookPen = New-Object System.Drawing.Pen($cream, (22 * $scale))
  $bookPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bookPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bookPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $left = @([System.Drawing.PointF]::new($cx - 210*$scale,$cy - 120*$scale),[System.Drawing.PointF]::new($cx - 45*$scale,$cy - 70*$scale),[System.Drawing.PointF]::new($cx,$cy + 165*$scale),[System.Drawing.PointF]::new($cx - 170*$scale,$cy + 95*$scale),[System.Drawing.PointF]::new($cx - 210*$scale,$cy - 120*$scale))
  $right = @([System.Drawing.PointF]::new($cx + 210*$scale,$cy - 120*$scale),[System.Drawing.PointF]::new($cx + 45*$scale,$cy - 70*$scale),[System.Drawing.PointF]::new($cx,$cy + 165*$scale),[System.Drawing.PointF]::new($cx + 170*$scale,$cy + 95*$scale),[System.Drawing.PointF]::new($cx + 210*$scale,$cy - 120*$scale))
  $g.DrawLines($bookPen, $left); $g.DrawLines($bookPen, $right)
  $cap = @([System.Drawing.PointF]::new($cx - 235*$scale,$cy - 165*$scale),[System.Drawing.PointF]::new($cx,$cy - 270*$scale),[System.Drawing.PointF]::new($cx + 235*$scale,$cy - 165*$scale),[System.Drawing.PointF]::new($cx,$cy - 60*$scale))
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $g.FillPolygon($goldBrush, $cap)
  $tassel = New-Object System.Drawing.Pen($gold, (18 * $scale)); $tassel.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($tassel, $cx + 220*$scale, $cy - 160*$scale, $cx + 220*$scale, $cy + 20*$scale)
  $g.FillEllipse($goldBrush, $cx + 195*$scale, $cy + 5*$scale, 50*$scale, 50*$scale)
  $bookPen.Dispose(); $goldBrush.Dispose(); $tassel.Dispose()
}

function Save-Png($canvas, [string]$path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose(); $canvas.Bitmap.Dispose()
}

$icon = New-Canvas 1024 1024
$icon.Graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F4B93A"))
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#2D2923"))
$shape = Rounded-Path 150 150 724 724 170
$icon.Graphics.FillPath($dark, $shape)
Draw-Mark $icon.Graphics 512 535 0.83
$dark.Dispose(); $shape.Dispose()
Save-Png $icon (Join-Path $output "connect-your-school-icon.png")

$foreground = New-Canvas 1024 1024 $true
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#2D2923"))
$shape = Rounded-Path 220 220 584 584 145
$foreground.Graphics.FillPath($dark, $shape)
Draw-Mark $foreground.Graphics 512 530 0.62
$dark.Dispose(); $shape.Dispose()
Save-Png $foreground (Join-Path $output "connect-your-school-foreground.png")

$mono = New-Canvas 432 432 $true
Draw-Mark $mono.Graphics 216 225 0.34 $true
Save-Png $mono (Join-Path $output "connect-your-school-monochrome.png")

$background = New-Canvas 512 512
$background.Graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F4B93A"))
Save-Png $background (Join-Path $output "connect-your-school-background.png")

$splash = New-Canvas 512 512 $true
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#2D2923"))
$shape = Rounded-Path 72 72 368 368 92
$splash.Graphics.FillPath($dark, $shape)
Draw-Mark $splash.Graphics 256 265 0.39
$dark.Dispose(); $shape.Dispose()
Save-Png $splash (Join-Path $output "connect-your-school-splash.png")

$feature = New-Canvas 1024 500
$g = $feature.Graphics
$paper = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#FFFDF8"))
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#2D2923"))
$gold = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#F4B93A"))
$g.FillRectangle($paper, 0, 0, 1024, 500)
$g.FillEllipse($gold, 720, -120, 440, 440)
$markBox = Rounded-Path 70 95 250 250 64
$g.FillPath($dark, $markBox)
Draw-Mark $g 195 230 0.27
$titleFont = New-Object System.Drawing.Font("Arial", 40, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$g.DrawString("Connect Your School", $titleFont, $dark, 355, 135)
$g.DrawString("School management, beautifully connected.", $subFont, $dark, 370, 215)
$g.DrawString("STUDENTS  |  FEES  |  RESULTS  |  NOTICES", $smallFont, $dark, 372, 285)
$paper.Dispose(); $dark.Dispose(); $gold.Dispose(); $markBox.Dispose(); $titleFont.Dispose(); $subFont.Dispose(); $smallFont.Dispose()
Save-Png $feature (Join-Path $store "feature-graphic-1024x500.png")

Write-Output "Mobile brand assets generated in $output and $store"
