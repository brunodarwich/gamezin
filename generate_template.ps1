Add-Type -AssemblyName System.Drawing

$width = 1024
$height = 1024
$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Fundo escuro profissional (#1a1d21)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 29, 33))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)
$bgBrush.Dispose()

# Grid fino de 32x32 px
$fineGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(15, 255, 255, 255), 1)
for ($x = 0; $x -le $width; $x += 32) {
    $g.DrawLine($fineGridPen, $x, 0, $x, $height)
}
for ($y = 0; $y -le $height; $y += 32) {
    $g.DrawLine($fineGridPen, 0, $y, $width, $y)
}
$fineGridPen.Dispose()

# Grid regular de 64x64 px
$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 255, 255, 255), 1)
for ($x = 0; $x -le $width; $x += 64) {
    $g.DrawLine($gridPen, $x, 0, $x, $height)
}
for ($y = 0; $y -le $height; $y += 64) {
    $g.DrawLine($gridPen, 0, $y, $width, $y)
}
$gridPen.Dispose()

# Fontes
$titleFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
$subFont   = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$coordFont = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$hintFont  = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)

function Draw-Section {
    param(
        [int]$X, [int]$Y, [int]$W, [int]$H,
        [string]$Title, [string]$Desc, [string]$Coords,
        [int]$R, [int]$GCol, [int]$B,
        [string[]]$Hints
    )

    $color = [System.Drawing.Color]::FromArgb(255, $R, $GCol, $B)

    # Preenchimento translúcido da área
    $fillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, $R, $GCol, $B))
    $g.FillRectangle($fillBrush, ($X + 4), ($Y + 4), ($W - 8), ($H - 8))
    $fillBrush.Dispose()

    # Borda externa sólida
    $borderPen = New-Object System.Drawing.Pen($color, 3)
    $g.DrawRectangle($borderPen, ($X + 3), ($Y + 3), ($W - 6), ($H - 6))
    $borderPen.Dispose()

    # Linhas de centro pontilhadas (guia de simetria)
    $guidePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(65, $R, $GCol, $B), 1)
    $guidePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $g.DrawLine($guidePen, ($X + [int]($W / 2)), ($Y + 8), ($X + [int]($W / 2)), ($Y + $H - 8))
    $g.DrawLine($guidePen, ($X + 8), ($Y + [int]($H / 2)), ($X + $W - 8), ($Y + [int]($H / 2)))
    $guidePen.Dispose()

    # Badge de coordenadas no canto superior direito
    $badgeW = 210
    $badgeH = 26
    $badgeX = $X + $W - $badgeW - 12
    $badgeY = $Y + 12
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 20, 23, 27))
    $badgePen   = New-Object System.Drawing.Pen($color, 1)
    $g.FillRectangle($badgeBrush, $badgeX, $badgeY, $badgeW, $badgeH)
    $g.DrawRectangle($badgePen, $badgeX, $badgeY, $badgeW, $badgeH)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 245, 250))
    $g.DrawString($Coords, $coordFont, $textBrush, ($badgeX + 6), ($badgeY + 5))

    # Título da Seção
    $titleBrush = New-Object System.Drawing.SolidBrush($color)
    $g.DrawString($Title, $titleFont, $titleBrush, ($X + 16), ($Y + 14))

    # Descrição
    $descBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 225, 230))
    $g.DrawString($Desc, $subFont, $descBrush, ($X + 16), ($Y + 44))

    # Dicas / Guias
    if ($Hints) {
        $hy = $Y + 76
        $hBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 190, 200))
        foreach ($hintText in $Hints) {
            $g.DrawString("- $hintText", $hintFont, $hBrush, ($X + 20), $hy)
            $hy += 22
        }
        $hBrush.Dispose()
    }

    $badgeBrush.Dispose()
    $badgePen.Dispose()
    $textBrush.Dispose()
    $titleBrush.Dispose()
    $descBrush.Dispose()
}

# 1. Frente da Tampa
Draw-Section -X 0 -Y 0 -W 512 -H 256 `
    -Title "1. FRENTE DA TAMPA" `
    -Desc "Madeira curvada, aba frontal e reforco metalico" `
    -Coords "[0, 0] a [512, 256] px" `
    -R 245 -GCol 158 -B 11 `
    -Hints @("Aba inferior que sobrepoe a base do bau", "Cintas metalicas com rebites nas laterais", "Borda superior curvada convexa")

# 2. Topo da Tampa
Draw-Section -X 512 -Y 0 -W 512 -H 256 `
    -Title "2. TOPO DA TAMPA" `
    -Desc "Superficie superior com tabuas e cintas de ferro" `
    -Coords "[512, 0] a [1024, 256] px" `
    -R 249 -GCol 115 -B 22 `
    -Hints @("Vista superior quando o bau esta fechado", "Duas cintas de reforco metalicas verticais", "Tabuas horizontais com veios de madeira")

# 3. Frente da Base
Draw-Section -X 0 -Y 256 -W 512 -H 256 `
    -Title "3. FRENTE DA BASE" `
    -Desc "Face frontal principal com fechadura dourada" `
    -Coords "[0, 256] a [512, 512] px" `
    -R 234 -GCol 179 -B 8 `
    -Hints @("Centro: Fechadura / fecho de metal dourado", "Tabuas de carvalho solidas", "Cantos inferiores com reforco de ferro escuro")

# Desenha contorno guia da fechadura no centro da frente da base
$lockPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 234, 179, 8), 2)
$lockPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawRectangle($lockPen, 226, (256 + 18), 60, 68)
$lockBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(234, 179, 8))
$g.DrawString("Fechadura", $hintFont, $lockBrush, 226, (256 + 90))
$lockPen.Dispose()
$lockBrush.Dispose()

# 4. Laterais (Esq. e Dir.)
Draw-Section -X 512 -Y 256 -W 512 -H 256 `
    -Title "4. LATERAIS (ESQ. E DIR.)" `
    -Desc "Textura compartilhada das faces laterais com alcas" `
    -Coords "[512, 256] a [1024, 512] px" `
    -R 59 -GCol 130 -B 246 `
    -Hints @("Aplicada em ambas as laterais do modelo 3D", "Alca de ferro fundido ou anel de transporte no centro", "Reforco metalico nos quatro cantos")

# 5. Traseira do Bau
Draw-Section -X 0 -Y 512 -W 512 -H 256 `
    -Title "5. TRASEIRA DO BAU" `
    -Desc "Face posterior com dobradicas metalicas articuladas" `
    -Coords "[0, 512] a [512, 768] px" `
    -R 168 -GCol 85 -B 247 `
    -Hints @("Duas dobradicas de ferro escuro conectando a tampa", "Tabuas continuas de madeira escura", "Sombreamento na fresta entre tampa e base")

# 6. Interior do Bau
Draw-Section -X 512 -Y 512 -W 512 -H 256 `
    -Title "6. INTERIOR DO BAU" `
    -Desc "Fundo interno revelado quando a tampa abre em 3D" `
    -Coords "[512, 512] a [1024, 768] px" `
    -R 244 -GCol 63 -B 94 `
    -Hints @("Forro de veludo vermelho vinho ou acolchoado luxuoso", "Bordas internas com sombra escura de profundidade", "Visivel durante a animacao de guardar macas")

# 7. Fundo da Base (Chao)
Draw-Section -X 0 -Y 768 -W 512 -H 256 `
    -Title "7. FUNDO DA BASE (CHAO)" `
    -Desc "Face inferior assentada rente ao solo do jogo" `
    -Coords "[0, 768] a [512, 1024] px" `
    -R 34 -GCol 197 -B 94 `
    -Hints @("Tabuas simples de madeira escura e rustica", "Raramente visivel (fica apoiada no chao)", "Pode conter assinatura ou logo discreto")

# 8. Detalhes & Reserva
Draw-Section -X 512 -Y 768 -W 512 -H 256 `
    -Title "8. AREA LIVRE / DETALHES" `
    -Desc "Espaco para rascunhos, paleta de cores e testes" `
    -Coords "[512, 768] a [1024, 1024] px" `
    -R 148 -GCol 163 -B 184 `
    -Hints @("Guarde paletas de cores e variacoes", "Rebites e pecas metalicas avulsas", "Area livre para testes de textura")

# Divisórias principais em branco reluzente
$mainAxisPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 255, 255), 3)
$g.DrawLine($mainAxisPen, 512, 0, 512, 1024)
$g.DrawLine($mainAxisPen, 0, 256, 1024, 256)
$g.DrawLine($mainAxisPen, 0, 512, 1024, 512)
$g.DrawLine($mainAxisPen, 0, 768, 1024, 768)
$mainAxisPen.Dispose()

# Moldura externa geral
$canvasBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), 4)
$g.DrawRectangle($canvasBorderPen, 2, 2, 1020, 1020)
$canvasBorderPen.Dispose()

# Salva arquivo na pasta do jogo
$outPath = "c:\Users\Bruno\Downloads\gamezin\bau-molde.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Salva também na pasta de artifacts para visualização
$artifactPath = "C:\Users\Bruno\.gemini\antigravity-ide\brain\a955067d-9618-4693-9270-1e48ae92a410\bau-molde.png"
$bmp.Save($artifactPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Output "SUCESSO: Molde gerado com precisao em: $outPath"
