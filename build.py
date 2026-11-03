#!/usr/bin/env python3
"""Arma el prototipo en un solo archivo HTML (funciona sin internet, con doble clic)."""
import base64, os, re, shutil, sys

# Opciones para la versión que se publica (preproducción):
#   --preprod=CARPETA      arma la página como index.html en CARPETA, lista para GitHub Pages
#   --sin-proveedores      quita los nombres de los proveedores del catálogo
#   --sin-costos           pone los costos en 0 (se cargan después en Catálogo, en cada equipo)
ARGS = sys.argv[1:]
PREPROD = next((a.split("=", 1)[1] for a in ARGS if a.startswith("--preprod=")), None)
SIN_PROV, SIN_COSTOS = "--sin-proveedores" in ARGS, "--sin-costos" in ARGS

R = os.path.dirname(os.path.abspath(__file__))
SRC, AS, DIST = os.path.join(R, "src"), os.path.join(R, "assets"), os.path.join(R, "dist")
VERSION = "V8"

def b64(nombre, mime):
    with open(os.path.join(AS, nombre), "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

def leer(n):
    with open(os.path.join(SRC, n), encoding="utf-8") as f:
        txt = f.read()
    if PREPROD and n == "catalog.js":
        if SIN_PROV: txt = re.sub(r'prov: "[^"]*"', 'prov: ""', txt)
        if SIN_COSTOS: txt = re.sub(r', c: [0-9.]+', ', c: 0', txt)
    if PREPROD and n == "ui.js":
        # en la versión publicada no van nombres de personas: cada equipo los escribe en Ajustes
        # (la página privada cifrada sí los lleva: --con-nombres)
        if "--con-nombres" not in ARGS:
            txt = txt.replace('"Supervisor"', '"Supervisor"')
    return txt

css = leer("styles.css")
for marca, arch in [("__OUTFIT__", "outfit.woff2"), ("__ZILLA__", "zilla-round.woff2"), ("__BLUSHES__", "fresh-blushes.woff2")]:
    css = css.replace(marca, b64(arch, "font/woff2"))
js = "\n".join(leer(n) for n in ["catalog.js", "parser.js", "engine.js", "acciones.js", "sim.js", "iconos.js", "vista3d.js", "aplauso.js", "ui.js"])
# sello de versión: cambia solo cuando cambia el código (la página publicada avisa si hay una más nueva)
import hashlib, time
BUILD_ID = hashlib.sha1((js + css).encode("utf-8")).hexdigest()[:8]
BUILD_FECHA = time.strftime("%Y-%m-%d %H:%M", time.gmtime(time.time() - 5 * 3600))   # hora de Ecuador
js = js.replace("__BUILD_ID__", BUILD_ID).replace("__BUILD_FECHA__", BUILD_FECHA)
for marca, arch in [("__CHEF__", "chef.webp"), ("__REEX_FELIZ__", "reex-feliz.webp"), ("__REEX_BRAZOS__", "reex-brazos.webp"), ("__REEX_SENTADO__", "reex-sentado.webp")]:
    js = js.replace(marca, b64(arch, "image/webp"))
html = leer("index.html").replace("/*CSS*/", css).replace("/*JS*/", js)
html = html.replace("__LOGO__", b64("logo.webp", "image/webp")).replace("__ICONO__", b64("reex-cara.webp", "image/webp")).replace("__REEX_CARA__", b64("reex-cara.webp", "image/webp"))
assert "__" not in html.replace("__proto__", ""), "quedó un marcador sin reemplazar"
# librería 3D (Three.js, licencia MIT): va incrustada para que la página funcione sin internet
with open(os.path.join(AS, "vendor", "three-0.149.0.min.js"), encoding="utf-8") as f:
    html = html.replace("/*VENDOR*/", f.read())

if PREPROD:
    # el repositorio es público: ni en el código ni en los comentarios puede quedar el nombre de una persona del equipo
    if "--con-nombres" not in ARGS:
        # se comparan huellas (sha1) de cada palabra con las de los nombres del personal: así este archivo, que también es público, no los lleva escritos
        import unicodedata
        HUELLAS = set(['2bc6038c3dfca09b', '378301bab2fe5f93', '592012c2ab36e973', '5f399373de38236d', '77f140b8b13ed27b', '7d45a16ca4a3b95b', '8f80b44968ea7b99', '9001f936c1857070', '914210f6350c14d7', 'a32bbb6381bae13d', 'b41592c80b79de22', 'bb4af54d4692022d', 'bf920d631e535afe', 'd0ded527a97bc880', 'e48356a61762e155', 'e7cd70ffc1b0e846', 'f3c34ef97e0846e1', 'f74b6decaf92a954', 'fcd1eee40b824e08'])
        def _clave(w):
            w = unicodedata.normalize("NFD", w.lower()); return "".join(c for c in w if unicodedata.category(c) != "Mn")
        hallados = sorted({w for w in set(re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", html)) if hashlib.sha1(_clave(w).encode()).hexdigest()[:16] in HUELLAS})
        assert not hallados, "la versión pública lleva nombres del personal: " + ", ".join(hallados)
        assert not re.search(r"sk-ant-[A-Za-z0-9_-]{10,}", html), "la versión pública lleva una clave"
    os.makedirs(PREPROD, exist_ok=True)
    with open(os.path.join(PREPROD, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    with open(os.path.join(PREPROD, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nDisallow: /\n")
    open(os.path.join(PREPROD, ".nojekyll"), "w").close()
    with open(os.path.join(PREPROD, "version.json"), "w", encoding="utf-8") as f:
        f.write('{"id":"%s","fecha":"%s"}\n' % (BUILD_ID, BUILD_FECHA))
    print("preproducción:", os.path.join(PREPROD, "index.html"), round(len(html.encode()) / 1024), "KB",
          "| sin proveedores" if SIN_PROV else "", "| sin costos" if SIN_COSTOS else "")
    sys.exit(0)

os.makedirs(DIST, exist_ok=True)
nombre = "Frutireex-Bodega-%s.html" % VERSION
with open(os.path.join(DIST, nombre), "w", encoding="utf-8") as f:
    f.write(html)

ps1 = r"""# Frutireex - servidor local de la página (solo esta computadora, 127.0.0.1)
# Siempre usa el mismo puerto (8765): así el navegador recuerda el permiso del micrófono.
$ErrorActionPreference = 'Stop'
$raiz = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$archivo = 'NOMBRE'
$puerto = 8765
$url = "http://127.0.0.1:$puerto/$archivo"
$yaActivo = $false
try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $puerto); $c.Close(); $yaActivo = $true } catch { }
if ($yaActivo) {
  # Ya está en marcha en este mismo puerto: solo se vuelve a mostrar en el navegador.
  $ya = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($ya) { Start-Process -FilePath $ya -ArgumentList $url } else { Start-Process $url }
  exit 0
}
$escucha = $null
try { $escucha = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $puerto; $escucha.Start() }
catch { exit 1 }
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
try {
  if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $url }
  elseif ($edge) { Start-Process -FilePath $edge -ArgumentList $url }
  else { Start-Process $url }
} catch { }
$tipos = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.png' = 'image/png'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon' }
while ($true) {
  $cli = $escucha.AcceptTcpClient()
  try {
    $flujo = $cli.GetStream(); $flujo.ReadTimeout = 1000
    $lector = New-Object System.IO.StreamReader($flujo)
    $linea = $lector.ReadLine()
    while ($true) { $h = $lector.ReadLine(); if ($h -eq $null -or $h -eq '') { break } }
    $ruta = '/'
    if ($linea -match '^(GET|HEAD)\s+(\S+)') { $ruta = [Uri]::UnescapeDataString(($matches[2] -split '\?')[0]) }
    if ($ruta -eq '/') { $ruta = '/' + $archivo }
    $completo = [IO.Path]::GetFullPath((Join-Path $raiz ($ruta.TrimStart('/') -replace '/', '\')))
    if ($completo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $completo -PathType Leaf)) {
      $cuerpo = [IO.File]::ReadAllBytes($completo)
      $tipo = $tipos[[IO.Path]::GetExtension($completo).ToLower()]; if (-not $tipo) { $tipo = 'application/octet-stream' }
      $cab = "HTTP/1.1 200 OK`r`nContent-Type: $tipo`r`nContent-Length: $($cuerpo.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    } else {
      $cuerpo = [Text.Encoding]::UTF8.GetBytes('No encontrado')
      $cab = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($cuerpo.Length)`r`nConnection: close`r`n`r`n"
    }
    $b = [Text.Encoding]::ASCII.GetBytes($cab); $flujo.Write($b, 0, $b.Length)
    if ($linea -notmatch '^HEAD') { $flujo.Write($cuerpo, 0, $cuerpo.Length) }
    $flujo.Flush()
  } catch { } finally { $cli.Close() }
}
""".replace("NOMBRE", nombre)
with open(os.path.join(DIST, "servidor.ps1"), "w", encoding="utf-8-sig", newline="\r\n") as f:
    f.write(ps1)

bat = r"""@echo off
title Frutireex Bodega y Local
cd /d "%~dp0"
rem (3-nov-2026, V8) si el oído de Rex está instalado, se prende solo y minimizado (si ya estaba prendido, el segundo se cierra solo)
if exist "%~dp0oido\venv\Scripts\python.exe" start "Oido de Rex" /min "%~dp0oido\venv\Scripts\python.exe" "%~dp0oido\servidor_oido.py"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if not errorlevel 1 goto :eof
echo.
echo  No se pudo iniciar con PowerShell. Pruebo con Python...
set PY=
python -c "import sys" >nul 2>nul && set PY=python
if not defined PY py -3 -c "import sys" >nul 2>nul && set PY=py -3
if not defined PY if exist "%USERPROFILE%\anaconda3\python.exe" set PY="%USERPROFILE%\anaconda3\python.exe"
if not defined PY (
  echo  Tampoco hay Python. Abro el archivo directo.
  start "" "NOMBRE"
  timeout /t 8 >nul
  goto :eof
)
start "" "http://127.0.0.1:8765/NOMBRE"
%PY% -m http.server 8765 --bind 127.0.0.1
""".replace("NOMBRE", nombre)
with open(os.path.join(DIST, "INICIAR.bat"), "w", encoding="utf-8", newline="\r\n") as f:
    f.write(bat)
print(nombre, round(len(html.encode()) / 1024), "KB")
