---
name: video-recipes
description: Tested ffmpeg/ImageMagick/exiftool recipes for quick video and image work on raw event footage — trim, concat, reframe 16:9 to 9:16, speed ramps, slow motion, stabilize, denoise, color tweaks, audio cleanup and loudness, silence detection, frames/contact sheets, GIFs, metadata. Use for any direct edit that doesn't need the full brand render pipeline (content-machine).
---

# Recetas de video (ffmpeg 9 + ImageMagick 7)

Notas del build instalado (Homebrew): hay `h264_videotoolbox`/`hevc_videotoolbox` (hardware), `libx264`, `loudnorm`, `lut3d`, `xfade`, `deshake`, `minterpolate`, `nlmeans`, `afftdn`, `curves`, `colortemperature`. **No** hay `drawtext`, `subtitles`/`ass`, `vidstab` ni `rubberband`: los textos y subtítulos se hacen en Remotion (skill `content-machine`).

Siempre trabaja sobre copias en `content-dna/<cuenta>/` y nunca sobrescribas el raw original.

## Inspeccionar

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact in.mov
exiftool -CreateDate -Model -GPSPosition -Rotation in.mov
```

## Cortar y unir

```bash
# Corte exacto (reencode) de 3.5 s a 9 s
ffmpeg -ss 3.5 -i in.mov -t 5.5 -c:v h264_videotoolbox -b:v 14M -c:a aac out.mp4
# Unir clips con el mismo formato
printf "file '%s'\n" a.mp4 b.mp4 c.mp4 > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4
# Fundido cruzado de 0.4 s entre dos clips (A dura 5 s)
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0][1]xfade=transition=fade:duration=0.4:offset=4.6;[0:a][1:a]acrossfade=d=0.4" out.mp4
```

## Formato vertical

```bash
# 16:9 → 9:16 recortando al centro
ffmpeg -i in.mov -vf "scale=-2:1920,crop=1080:1920,fps=30,setsar=1" -c:v h264_videotoolbox -b:v 14M -c:a aac out.mp4
# 16:9 → 9:16 sin recortar: fondo desenfocado + video al centro
ffmpeg -i in.mov -filter_complex "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40[bg];[0]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy out.mp4
```

## Tiempo

```bash
# Slow motion 50% con interpolación (para tomas de 30 fps)
ffmpeg -i in.mp4 -vf "minterpolate=fps=60:mi_mode=mci,setpts=2.0*PTS" -an slow.mp4
# Acelerar 2x con audio
ffmpeg -i in.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" fast.mp4
# Reversa (clips cortos)
ffmpeg -i in.mp4 -vf reverse -af areverse rev.mp4
```

## Imagen

```bash
# Estabilizar (ligero)
ffmpeg -i in.mp4 -vf deshake out.mp4
# Reducir ruido de tomas nocturnas
ffmpeg -i in.mp4 -vf "hqdn3d=3:3:6:6" out.mp4
# Ajuste rápido: más contraste, menos saturación, más cálido
ffmpeg -i in.mp4 -vf "eq=contrast=1.12:saturation=0.9,colortemperature=temperature=4800" out.mp4
# LUT .cube
ffmpeg -i in.mp4 -vf "lut3d=look.cube" out.mp4
```

## Audio

```bash
# Limpiar ruido de fondo y normalizar para Instagram (-14 LUFS)
ffmpeg -i in.mp4 -af "afftdn=nf=-25,loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy out.mp4
# Medir volumen
ffmpeg -i in.mp4 -af ebur128 -f null - 2>&1 | grep -E "I:|LRA:"
# Encontrar silencios (para cortar pausas en entrevistas)
ffmpeg -i in.mp4 -af silencedetect=noise=-35dB:d=0.4 -f null - 2>&1 | grep silence_
# Poner música debajo de la voz (ducking)
ffmpeg -i voz.mp4 -i musica.mp3 -filter_complex "[1]volume=0.25[m];[m][0:a]sidechaincompress=threshold=0.05:ratio=8[d];[0:a][d]amix=inputs=2:duration=first" -c:v copy out.mp4
```

## Frames, hojas de contacto, GIF

```bash
# Hoja de contacto 3×3 para revisar un clip
ffmpeg -i in.mp4 -vf "fps=9/DURACION,scale=360:-1,tile=3x3" -frames:v 1 sheet.jpg
# Frame exacto como portada
ffmpeg -ss 2.4 -i in.mp4 -frames:v 1 -q:v 2 cover.jpg
# GIF liviano
ffmpeg -i in.mp4 -vf "fps=12,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif
# Unir imágenes lado a lado (comparar versiones)
magick a.jpg b.jpg +append compare.jpg
```

## Exportar para redes

```bash
# Instagram/TikTok: H.264, 1080×1920, 30 fps, AAC 48 kHz, faststart
ffmpeg -i in.mov -vf "scale=1080:1920,fps=30" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart final.mp4
```
