Add-Type -AssemblyName System.Drawing

function Create-AppIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Clear transparent
    $g.Clear([System.Drawing.Color]::Transparent)

    # Red Gradient Background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $cTop = [System.Drawing.Color]::FromArgb(255, 235, 30, 60)
    $cBottom = [System.Drawing.Color]::FromArgb(255, 160, 10, 40)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 45.0)

    # Rounded Rect Path (Squircle corner radius ~22%)
    $corner = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $arcRect = New-Object System.Drawing.Rectangle(0, 0, $corner * 2, $corner * 2)
    
    $path.AddArc(0, 0, $corner * 2, $corner * 2, 180, 90)
    $path.AddArc($size - $corner * 2 - 1, 0, $corner * 2, $corner * 2, 270, 90)
    $path.AddArc($size - $corner * 2 - 1, $size - $corner * 2 - 1, $corner * 2, $corner * 2, 0, 90)
    $path.AddArc(0, $size - $corner * 2 - 1, $corner * 2, $corner * 2, 90, 90)
    $path.CloseFigure()

    $g.FillPath($brush, $path)

    # Subtle white border highlight
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), [Math]::Max(1.0, [float]($size * 0.015)))
    $g.DrawPath($pen, $path)

    # White Pen & Brushes
    $whiteBrush = [System.Drawing.Brushes]::White
    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float]($size * 0.04))
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Scale factors relative to 512 base
    $scale = $size / 512.0

    # 1. Delivery / Rep Truck Body
    # Cargo container
    $cargoX = 110 * $scale
    $cargoY = 150 * $scale
    $cargoW = 185 * $scale
    $cargoH = 145 * $scale
    $cargoR = 18 * $scale

    $cargoPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $cargoPath.AddArc($cargoX, $cargoY, $cargoR * 2, $cargoR * 2, 180, 90)
    $cargoPath.AddArc($cargoX + $cargoW - $cargoR * 2, $cargoY, $cargoR * 2, $cargoR * 2, 270, 90)
    $cargoPath.AddArc($cargoX + $cargoW - $cargoR * 2, $cargoY + $cargoH - $cargoR * 2, $cargoR * 2, $cargoR * 2, 0, 90)
    $cargoPath.AddArc($cargoX, $cargoY + $cargoH - $cargoR * 2, $cargoR * 2, $cargoR * 2, 90, 90)
    $cargoPath.CloseFigure()
    $g.FillPath($whiteBrush, $cargoPath)

    # Truck Cab
    $cabPoints = @(
        (New-Object System.Drawing.PointF(300 * $scale, 190 * $scale)),
        (New-Object System.Drawing.PointF(350 * $scale, 190 * $scale)),
        (New-Object System.Drawing.PointF(395 * $scale, 255 * $scale)),
        (New-Object System.Drawing.PointF(395 * $scale, 295 * $scale)),
        (New-Object System.Drawing.PointF(300 * $scale, 295 * $scale))
    )
    $g.FillPolygon($whiteBrush, $cabPoints)

    # Window Cutout (Red fill)
    $winPoints = @(
        (New-Object System.Drawing.PointF(312 * $scale, 202 * $scale)),
        (New-Object System.Drawing.PointF(345 * $scale, 202 * $scale)),
        (New-Object System.Drawing.PointF(372 * $scale, 248 * $scale)),
        (New-Object System.Drawing.PointF(312 * $scale, 248 * $scale))
    )
    $redInner = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 25, 55))
    $g.FillPolygon($redInner, $winPoints)

    # Package / Stock Box Motif on Truck Side
    # Draw a 3D isometric box inside cargo
    $boxPointsTop = @(
        (New-Object System.Drawing.PointF(202 * $scale, 180 * $scale)),
        (New-Object System.Drawing.PointF(238 * $scale, 198 * $scale)),
        (New-Object System.Drawing.PointF(202 * $scale, 216 * $scale)),
        (New-Object System.Drawing.PointF(166 * $scale, 198 * $scale))
    )
    $boxPointsLeft = @(
        (New-Object System.Drawing.PointF(166 * $scale, 198 * $scale)),
        (New-Object System.Drawing.PointF(202 * $scale, 216 * $scale)),
        (New-Object System.Drawing.PointF(202 * $scale, 258 * $scale)),
        (New-Object System.Drawing.PointF(166 * $scale, 240 * $scale))
    )
    $boxPointsRight = @(
        (New-Object System.Drawing.PointF(202 * $scale, 216 * $scale)),
        (New-Object System.Drawing.PointF(238 * $scale, 198 * $scale)),
        (New-Object System.Drawing.PointF(238 * $scale, 240 * $scale)),
        (New-Object System.Drawing.PointF(202 * $scale, 258 * $scale))
    )
    $redBoxTop = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 60, 85))
    $redBoxLeft = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 190, 20, 50))
    $redBoxRight = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 160, 15, 40))

    $g.FillPolygon($redBoxTop, $boxPointsTop)
    $g.FillPolygon($redBoxLeft, $boxPointsLeft)
    $g.FillPolygon($redBoxRight, $boxPointsRight)

    # Wheels
    # Front wheel
    $g.FillEllipse($whiteBrush, [float](325 * $scale), [float](280 * $scale), [float](60 * $scale), [float](60 * $scale))
    $g.FillEllipse($redInner, [float](338 * $scale), [float](293 * $scale), [float](34 * $scale), [float](34 * $scale))
    $g.FillEllipse($whiteBrush, [float](347 * $scale), [float](302 * $scale), [float](16 * $scale), [float](16 * $scale))

    # Rear wheel
    $g.FillEllipse($whiteBrush, [float](150 * $scale), [float](280 * $scale), [float](60 * $scale), [float](60 * $scale))
    $g.FillEllipse($redInner, [float](163 * $scale), [float](293 * $scale), [float](34 * $scale), [float](34 * $scale))
    $g.FillEllipse($whiteBrush, [float](172 * $scale), [float](302 * $scale), [float](16 * $scale), [float](16 * $scale))

    # Speed Motion Streaks behind truck
    $streakPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float](6 * $scale))
    $streakPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $streakPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($streakPen, [float](65 * $scale), [float](195 * $scale), [float](95 * $scale), [float](195 * $scale))
    $g.DrawLine($streakPen, [float](50 * $scale), [float](222 * $scale), [float](90 * $scale), [float](222 * $scale))
    $g.DrawLine($streakPen, [float](60 * $scale), [float](250 * $scale), [float](95 * $scale), [float](250 * $scale))

    # Bottom Text: "SALES REP"
    $fontFamily = New-Object System.Drawing.FontFamily("Arial")
    $fontSize = [float](34 * $scale)
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF(0, [float](385 * $scale), [float]$size, [float](50 * $scale))
    $g.DrawString("SALES REP", $font, $whiteBrush, $textRect, $format)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

Create-AppIcon 512 "frontend/public/app-icon-512.png"
Create-AppIcon 192 "frontend/public/app-icon-192.png"
Create-AppIcon 180 "frontend/public/apple-touch-icon.png"
