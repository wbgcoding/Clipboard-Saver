@echo off
setlocal
color 0a 2>nul
mode con lines=20 cols=83 >nul 2>nul
:: Hier Projektnamen eintragen
set "project=Clipboard-Saver" 

title Backup %project%
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format 'yyyy-MM-dd HH-mm-ss'"`) do (set "datestamp=%%i")
set "source=C:\Claude\%project%"
set "backupdir=C:\Claude\.Backup\%project%"
set "zipfile=%backupdir%\%project% %datestamp%.zip"
if not exist "%backupdir%" md "%backupdir%"
:: Projektordner als ZIP mit maximaler Komprimierung speichern (7-Zip, sonst Fallback)
set "sevenzip=%ProgramFiles%\7-Zip\7z.exe"
if not exist "%sevenzip%" set "sevenzip=%ProgramFiles(x86)%\7-Zip\7z.exe"
if exist "%sevenzip%" (
    "%sevenzip%" a -tzip -mx=9 "%zipfile%" "%source%\*" -xr!BACKUP.bat
) else (
    set "zipfallback=1"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%source%' -Exclude 'BACKUP.bat' | Compress-Archive -DestinationPath '%zipfile%' -CompressionLevel Optimal"
)
set "result=%errorlevel%"
echo.
echo ZIP erstellt:
echo %zipfile%
echo.
if defined zipfallback (
    echo HINWEIS: 7-Zip nicht gefunden - normales ZIP wurde verwendet.
    pause 2>nul
) else (
    rem timeout braucht eine interaktive Konsole - Fehler dort ist egal
    timeout 5 2>nul
)
exit /b %result%